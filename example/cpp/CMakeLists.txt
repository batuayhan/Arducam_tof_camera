cmake_minimum_required(VERSION 3.4)

project(cpp_example)

find_package(OpenCV REQUIRED)
include_directories(${OpenCV_INCLUDE_DIRS})

# ---- preview_depth ----
add_executable(preview_depth preview_depth.cpp)
target_link_libraries(preview_depth ${CXXLIBS} ${OpenCV_LIBS})

# ---- preview_depth_stream (MJPEG) ----
add_executable(preview_depth_stream preview_depth_stream.cpp)
target_include_directories(preview_depth_stream PRIVATE ${CMAKE_CURRENT_SOURCE_DIR})
target_link_libraries(preview_depth_stream ${CXXLIBS} ${OpenCV_LIBS})

# ---- capture_raw ----
add_executable(capture_raw capture_raw.cpp)
target_link_libraries(capture_raw ${CXXLIBS} ${OpenCV_LIBS})

# ---- preview_usb ----
add_executable(preview_usb preview_by_usb.cpp)
target_link_libraries(preview_usb ${CXXLIBS} ${OpenCV_LIBS})

# ---- example (folder: example/) ----
aux_source_directory(example DIR_SRCS)
add_executable(example ${DIR_SRCS})
target_link_libraries(example ${CXXLIBS} ${OpenCV_LIBS})
