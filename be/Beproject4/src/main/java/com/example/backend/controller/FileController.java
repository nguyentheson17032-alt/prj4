package com.example.backend.controller;

import com.example.backend.service.FileStorageService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;

@RestController
@RequestMapping("/api/files")
@CrossOrigin(origins = "http://localhost:3000")
public class FileController {

    @Autowired
    private FileStorageService fileStorageService;

    /**
     * Serve video files with proper headers for streaming
     */
    @GetMapping("/videos/{filename:.+}")
    public ResponseEntity<StreamingResponseBody> serveVideo(@PathVariable String filename) {
        try {
            Resource resource = fileStorageService.loadFileAsResource("report-videos/" + filename);
            
            if (!resource.exists()) {
                return ResponseEntity.notFound().build();
            }

            StreamingResponseBody responseBody = new StreamingResponseBody() {
                @Override
                public void writeTo(OutputStream outputStream) throws IOException {
                    try (InputStream inputStream = resource.getInputStream()) {
                        byte[] buffer = new byte[8192];
                        int bytesRead;
                        while ((bytesRead = inputStream.read(buffer)) != -1) {
                            outputStream.write(buffer, 0, bytesRead);
                        }
                    }
                }
            };

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.parseMediaType("video/mp4"));
            headers.set("Accept-Ranges", "bytes");
            headers.set("Content-Disposition", "inline; filename=\"" + filename + "\"");

            return ResponseEntity.ok()
                    .headers(headers)
                    .body(responseBody);

        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * Serve image files
     */
    @GetMapping("/images/{filename:.+}")
    public ResponseEntity<Resource> serveImage(@PathVariable String filename) {
        try {
            Resource resource = fileStorageService.loadFileAsResource("player-images/" + filename);
            
            if (!resource.exists()) {
                return ResponseEntity.notFound().build();
            }

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.IMAGE_JPEG);
            headers.set("Content-Disposition", "inline; filename=\"" + filename + "\"");

            return ResponseEntity.ok()
                    .headers(headers)
                    .body(resource);

        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * Serve any file by path
     */
    @GetMapping("/serve/{folder}/{filename:.+}")
    public ResponseEntity<Resource> serveFile(
            @PathVariable String folder,
            @PathVariable String filename) {
        try {
            Resource resource = fileStorageService.loadFileAsResource(folder + "/" + filename);
            
            if (!resource.exists()) {
                return ResponseEntity.notFound().build();
            }

            // Determine content type based on file extension
            String contentType = determineContentType(filename);
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.parseMediaType(contentType));
            headers.set("Content-Disposition", "inline; filename=\"" + filename + "\"");

            return ResponseEntity.ok()
                    .headers(headers)
                    .body(resource);

        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * Determine content type based on file extension
     */
    private String determineContentType(String filename) {
        String extension = filename.toLowerCase();
        if (extension.endsWith(".mp4")) {
            return "video/mp4";
        } else if (extension.endsWith(".avi")) {
            return "video/x-msvideo";
        } else if (extension.endsWith(".mov")) {
            return "video/quicktime";
        } else if (extension.endsWith(".wmv")) {
            return "video/x-ms-wmv";
        } else if (extension.endsWith(".flv")) {
            return "video/x-flv";
        } else if (extension.endsWith(".webm")) {
            return "video/webm";
        } else if (extension.endsWith(".mkv")) {
            return "video/x-matroska";
        } else if (extension.endsWith(".3gp")) {
            return "video/3gpp";
        } else if (extension.endsWith(".jpg") || extension.endsWith(".jpeg")) {
            return "image/jpeg";
        } else if (extension.endsWith(".png")) {
            return "image/png";
        } else if (extension.endsWith(".gif")) {
            return "image/gif";
        } else if (extension.endsWith(".webp")) {
            return "image/webp";
        } else {
            return "application/octet-stream";
        }
    }
} 