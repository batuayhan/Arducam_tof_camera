extern "C" {
#include "ArducamDepthCamera.h"
}

#include <opencv2/opencv.hpp>

#include <atomic>
#include <chrono>
#include <cmath>
#include <cstdio>
#include <mutex>
#include <thread>
#include <vector>

// cpp-httplib (tek header)
#include "httplib.h"

static std::mutex g_mtx;
static cv::Mat g_latest_bgr;
static std::atomic<bool> g_running{true};

static inline uint8_t depth_to_u8(float d_meters, float min_m, float max_m) {
    if (!std::isfinite(d_meters)) return 0;
    if (d_meters < min_m) d_meters = min_m;
    if (d_meters > max_m) d_meters = max_m;
    float t = (d_meters - min_m) / (max_m - min_m);
    int v = (int)std::lround(t * 255.0f);
    if (v < 0) v = 0;
    if (v > 255) v = 255;
    return (uint8_t)v;
}

static void start_mjpeg_server(uint16_t port) {
    std::thread([port] {
        httplib::Server svr;

        svr.Get("/", [](const httplib::Request&, httplib::Response& res) {
            const char* html =
                "<html><body style='margin:0;background:#000'>"
                "<img src='/mjpeg' style='width:100vw;height:auto'/>"
                "</body></html>";
            res.set_content(html, "text/html");
        });

        svr.Get("/mjpeg", [](const httplib::Request&, httplib::Response& res) {
            res.set_header("Cache-Control", "no-cache");
            res.set_header("Pragma", "no-cache");
            res.set_header("Connection", "close");

            res.set_content_provider(
                "multipart/x-mixed-replace; boundary=frame",
                [](size_t, httplib::DataSink& sink) {
                    while (g_running.load()) {
                        cv::Mat frame;
                        {
                            std::lock_guard<std::mutex> lock(g_mtx);
                            if (!g_latest_bgr.empty()) frame = g_latest_bgr.clone();
                        }

                        if (frame.empty()) {
                            std::this_thread::sleep_for(std::chrono::milliseconds(30));
                            continue;
                        }

                        std::vector<uchar> jpg;
                        std::vector<int> params = {cv::IMWRITE_JPEG_QUALITY, 80};
                        cv::imencode(".jpg", frame, jpg, params);

                        std::string header =
                            "--frame\r\n"
                            "Content-Type: image/jpeg\r\n"
                            "Content-Length: " + std::to_string(jpg.size()) + "\r\n\r\n";

                        if (!sink.write(header.data(), header.size())) break;
                        if (!sink.write(reinterpret_cast<const char*>(jpg.data()), jpg.size())) break;
                        if (!sink.write("\r\n", 2)) break;

                        std::this_thread::sleep_for(std::chrono::milliseconds(50)); // ~20 FPS
                    }
                    return true;
                }
            );
        });

        printf("[MJPEG] Listening on 0.0.0.0:%d\n", port);
        svr.listen("0.0.0.0", port);
    }).detach();
}

int main() {
    // MJPEG server
    start_mjpeg_server(8080);

    // Camera
    ArducamDepthCamera tof = createArducamDepthCamera();
    ArducamFrameBuffer frame = 0x00;

    if (arducamCameraOpen(tof, CONNECTION_CSI, 0)) {
        printf("Failed to open camera\n");
        return -1;
    }
    if (arducamCameraStart(tof, DEPTH_FRAME)) {
        printf("Failed to start camera\n");
        return -1;
    }

    ArducamCameraInfo info = arducamCameraGetInfo(tof);
    const int w = (int)info.width;
    const int h = (int)info.height;

    printf("open camera with (%d x %d)\n", w, h);
    printf("Open on phone: http://<PI_IP>:8080 (or /mjpeg)\n");

    cv::Mat depth_u8(h, w, CV_8UC1);
    cv::Mat depth_color(h, w, CV_8UC3);

    // 2m moddaysa 2.0 yapıp kontrastı artırabilirsin
    const float MIN_M = 0.20f;
    const float MAX_M = 4.00f;

    while (true) {
        frame = arducamCameraRequestFrame(tof, 200);
        if (frame == 0x00) continue;

        float* depth_ptr = (float*)arducamCameraGetDepthData(frame);

        for (int y = 0; y < h; y++) {
            uint8_t* row = depth_u8.ptr<uint8_t>(y);
            for (int x = 0; x < w; x++) {
                row[x] = depth_to_u8(depth_ptr[y * w + x], MIN_M, MAX_M);
            }
        }

        arducamCameraReleaseFrame(tof, frame);

        cv::applyColorMap(depth_u8, depth_color, cv::COLORMAP_JET);

        {
            std::lock_guard<std::mutex> lock(g_mtx);
            g_latest_bgr = depth_color.clone();
        }
    }

    g_running.store(false);
    arducamCameraStop(tof);
    arducamCameraClose(&tof);
    return 0;
}
