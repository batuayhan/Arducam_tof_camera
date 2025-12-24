import time
import cv2
import numpy as np
from flask import Flask, Response

import ArducamDepthCamera as ac

# MAX_DISTANCE value modifiable is 2000 or 4000
MAX_DISTANCE = 4000

confidence_value = 30

app = Flask(__name__)

class UserRect:
    def __init__(self) -> None:
        self.start_x = 0
        self.start_y = 0
        self.end_x = 0
        self.end_y = 0

    @property
    def rect(self):
        return (
            self.start_x,
            self.start_y,
            self.end_x - self.start_x,
            self.end_y - self.start_y,
        )

    @property
    def slice(self):
        return (slice(self.start_y, self.end_y), slice(self.start_x, self.end_x))

    @property
    def empty(self):
        return self.start_x == self.end_x and self.start_y == self.end_y

selectRect, followRect = UserRect(), UserRect()

def getPreviewRGB(preview: np.ndarray, confidence: np.ndarray) -> np.ndarray:
    preview = np.nan_to_num(preview)
    preview[confidence < confidence_value] = (0, 0, 0)
    return preview

def on_mouse(event, x, y, flags, param):
    global selectRect, followRect
    if event == cv2.EVENT_LBUTTONUP:
        selectRect.start_x = x - 4
        selectRect.start_y = y - 4
        selectRect.end_x = x + 4
        selectRect.end_y = y + 4
    else:
        followRect.start_x = x - 4
        followRect.start_y = y - 4
        followRect.end_x = x + 4
        followRect.end_y = y + 4

def init_camera():
    print("Arducam Depth Camera Stream.")
    print("  SDK version:", ac.__version__)

    cam = ac.ArducamCamera()
    cfg_path = None
    # cfg_path = "file.cfg"

    if cfg_path is not None:
        ret = cam.openWithFile(cfg_path, 0)
    else:
        ret = cam.open(ac.Connection.CSI, 0)

    if ret != 0:
        raise RuntimeError(f"Failed to open camera. Error code: {ret}")

    ret = cam.start(ac.FrameType.DEPTH)
    if ret != 0:
        cam.close()
        raise RuntimeError(f"Failed to start camera. Error code: {ret}")

    cam.setControl(ac.Control.RANGE, MAX_DISTANCE)
    r = cam.getControl(ac.Control.RANGE)

    info = cam.getCameraInfo()
    print(f"Camera resolution: {info.width}x{info.height} range={r}")

    return cam, info, r

cam, info, r = init_camera()

white_color = (255, 255, 255)
black_color = (0, 0, 0)

def gen_mjpeg():
    global r
    while True:
        frame = cam.requestFrame(2000)
        if frame is not None and isinstance(frame, ac.DepthData):
            depth_buf = frame.depth_data
            confidence_buf = frame.confidence_data

            # preview_depth.py ile aynı render
            result_image = (depth_buf * (255.0 / r)).astype(np.uint8)
            result_image = cv2.applyColorMap(result_image, cv2.COLORMAP_RAINBOW)
            result_image = getPreviewRGB(result_image, confidence_buf)

            # overlay (opsiyonel)
            cv2.rectangle(result_image, followRect.rect, white_color, 1)
            if not selectRect.empty:
                cv2.rectangle(result_image, selectRect.rect, black_color, 2)

            cam.releaseFrame(frame)

            ok, jpg = cv2.imencode(".jpg", result_image, [int(cv2.IMWRITE_JPEG_QUALITY), 80])
            if ok:
                yield (b"--frame\r\n"
                       b"Content-Type: image/jpeg\r\n\r\n" +
                       jpg.tobytes() + b"\r\n")
        else:
            # frame gelmediyse CPU yakmayalım
            time.sleep(0.01)

        time.sleep(0.05)  # ~20 FPS

@app.route("/")
def index():
    return "<html><body style='margin:0;background:#000'><img src='/mjpeg' style='width:100vw;height:auto'/></body></html>"

@app.route("/mjpeg")
def mjpeg():
    return Response(gen_mjpeg(), mimetype="multipart/x-mixed-replace; boundary=frame")

if __name__ == "__main__":
    print("Open on phone: http://<PI_IP>:8080/")
    print("Press CTRL+C to stop.")
    # NOT: Bu script GUI açmıyor; mouse callback çalışmaz.
    # İstersen PC’de bir pencere açıp mouse ile seçimi kontrol edebiliriz.
    app.run(host="0.0.0.0", port=8080, threaded=True)
