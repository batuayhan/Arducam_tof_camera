#include "ArducamDepthCamera.h"

#include <opencv2/opencv.hpp>

#include <atomic>
#include <chrono>
#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <mutex>
#include <thread>
#include <vector>

// ---- MJPEG server için tek header: cpp-httplib ----
// İndir: https://github.com/yhirose/cpp-httplib/blob/master/httplib.h
#include "httplib.h"

// En son üretilen görüntü burada tutulacak
static std::mutex g_mtx;
static cv::Mat g_latest_bgr;
static std::atomic<bool> g_running{true};

// Depth'i (metre) 8-bit'e map eden yardımcı
static inline uint8_t depth_to_u8(float d_meters, float min_m, float max_m) {
    if (!std::isfinite(d_meters)) return 0;
    if (d_meters < min_m) d_meters = min_m;
    if (d_meters > max_m) d_meters = max_m;
    float t = (d_meters - min_m) / (max_m - min_m); // 0..1
    int v = (int)std::lround(t * 255.0f);
    if (v < 0) v = 0;
    if (v > 255) v = 255;
    return (uint8_t)v;
}

static void start_mjpeg_server(uint16_t port) {
    std::thread([port] {
        httplib::Server svr;

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
                            if (g_latest_bgr.empty()) {
                                // Henüz frame yoksa biraz bekle
                                // (sink.write yapmadan döngüde beklemek tarayıcıyı kilitlemesin diye)
                            } else {
                                frame = g_latest_bgr.clone();
                            }
                        }

                        if (frame.empty()) {
                            std::this_thread::sleep_for(std::chrono::milliseconds(30));
                            continue;
                        }

                        std::vector<uchar> jpg;
                        // JPEG kaliteyi artırmak istersen 80-90 arası ver
                        std::vector<int> params = {cv::IMWRITE_JPEG_QUALITY, 80};
                        cv::imencode(".jpg", frame, jpg, params);

                        std::string header =
                            "--frame\r\n"
                            "Content-Type: image/jpeg\r\n"
                            "Content-Length: " + std::to_string(jpg.size()) + "\r\n\r\n";

                        if (!sink.write(header.data(), header.size())) break;
                        if (!sink.write(reinterpret_cast<const char*>(jpg.data()), jpg.size())) break;
                        if (!sink.write("\r\n", 2)) break;

                        // FPS ayarı: 20 fps civarı
                        std::this_thread::sleep_for(std::chrono::milliseconds(50));
                    }
                    return true;
                }
            );
        });

        svr.Get("/", [](const httplib::Request&, httplib::Response& res) {
            const char* html =
                "<html><body style='margin:0;background:#000'>"
                "<img src='/mjpeg' style='width:100vw;height:auto'/>"
                "</body></html>";
            res.set_content(html, "text/html");
        });

        printf("[MJPEG] Listening on 0.0.0.0:%d\n", port);
        svr.listen("0.0.0.0", port);
    }).detach();
}

int main() {
    // 1) MJPEG server
    start_mjpeg_server(8080);

    // 2) Kamera aç/başlat
    ArducamDepthCamera tof = createArducamDepthCamera();
    if (arducamCameraOpen(tof, CONNECTION_CSI, 0)) {
        printf("Failed to open camera\n");
        return -1;
    }

    if (arducamCameraStart(tof, DEPTH_FRAME)) {
        printf("Failed to start camera\n");
        return -1;
    }

    ArducamCameraInfo info = arducamCameraGetInfo(tof);
    printf("open camera with (%d x %d)\n", (int)info.width, (int)info.height);

    // Depth görüntü boyutu (genelde 240x180)
    const int w = (int)info.width;
    const int h = (int)info.height;

    // Depth’i 8-bit’e maplemek için buffer
    cv::Mat depth_u8(h, w, CV_8UC1);
    cv::Mat depth_color(h, w, CV_8UC3);

    // Range: kameranın 2m/4m moduna göre değişebilir
    // Şimdilik 0.2..4.0 m aralığı iyi bir başlangıç.
    const float MIN_M = 0.20f;
    const float MAX_M = 4.00f;

    printf("Stream: http://<PI_IP>:8080 (or /mjpeg)\n");

    ArducamFrameBuffer frame = 0x00;

    while (true) {
        frame = arducamCameraRequestFrame(tof, 200);
        if (frame == 0x00) {
            // timeout
            continue;
        }

        // Frame format (w/h)
        ArducamFrameFormat format = arducamCameraGetFormat(frame, DEPTH_FRAME);
        if ((int)format.width != w || (int)format.height != h) {
            // beklenmeyen durum (nadiren)
            // yine de devam edelim
        }

        // Depth pointer (metre cinsinden float array)
        float* depth_ptr = (float*)arducamCameraGetDepthData(frame);

        // Confidence (istersen düşük confidence’ı siyaha çekebilirsin)
        // float* conf_ptr = (float*)arducamCameraGetConfidenceData(frame);

        // Depth -> 8bit
        // IMPORTANT: depth_ptr sadece frame yaşarken valid, o yüzden
        // hemen Mat'e kopyalayıp sonra release yapıyoruz.
        for (int y = 0; y < h; y++) {
            uint8_t* row = depth_u8.ptr<uint8_t>(y);
            for (int x = 0; x < w; x++) {
                float d = depth_ptr[y * w + x];
                row[x] = depth_to_u8(d, MIN_M, MAX_M);
            }
        }

        // Frame’i serbest bırak
        arducamCameraReleaseFrame(tof, frame);

        // Renklendir (JET)
        cv::applyColorMap(depth_u8, depth_color, cv::COLORMAP_JET);

        // İstersen üstüne yazı overlay
        // cv::putText(depth_color, "ToF Depth", {10, 20}, cv::FONT_HERSHEY_SIMPLEX, 0.5, {255,255,255}, 1);

        // Latest frame’i güncelle
        {
            std::lock_guard<std::mutex> lock(g_mtx);
            g_latest_bgr = depth_color.clone();
        }
    }

    // (buraya normalde gelmez)
    g_running.store(false);

    arducamCameraStop(tof);
    arducamCameraClose(tof);
    return 0;
}
