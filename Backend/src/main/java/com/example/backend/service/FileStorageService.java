package com.example.backend.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Set;
import java.util.UUID;

@Service
public class FileStorageService {

    @Value("${file.upload-dir}")
    private String uploadDir;

    private static final Set<String> ALLOWED_EXTENSIONS = Set.of(
        ".jpg", ".jpeg", ".png", ".webp", ".gif",
        ".mp4", ".mov", ".webm", ".avi", ".mkv", ".3gp"
    );

    public String storeFile(MultipartFile file, String subDir) throws IOException {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("File không được để trống");
        }

        // Clean subDir against path traversal
        String safeSubDir = subDir != null ? subDir.replaceAll("[.\\\\/]+", "") : "misc";
        Path uploadPath = Paths.get(uploadDir, safeSubDir).toAbsolutePath().normalize();
        if (!Files.exists(uploadPath)) {
            Files.createDirectories(uploadPath);
        }

        // Generate unique filename with extension validation
        String originalFilename = file.getOriginalFilename();
        if (originalFilename == null || !originalFilename.contains(".")) {
            throw new IllegalArgumentException("Tên file không hợp lệ");
        }

        String extension = originalFilename.substring(originalFilename.lastIndexOf(".")).toLowerCase();
        if (!ALLOWED_EXTENSIONS.contains(extension)) {
            throw new IllegalArgumentException("Loại file không được hỗ trợ. Chỉ chấp nhận ảnh và video phổ biến!");
        }

        String filename = UUID.randomUUID().toString() + extension;

        // Save file
        Path filePath = uploadPath.resolve(filename);
        Files.copy(file.getInputStream(), filePath);

        // Return relative path
        return safeSubDir + "/" + filename;
    }

    public void deleteFile(String filePath) throws IOException {
        Path basePath = Paths.get(uploadDir).toAbsolutePath().normalize();
        Path path = basePath.resolve(filePath).normalize();
        if (path.startsWith(basePath)) {
            Files.deleteIfExists(path);
        }
    }

    /**
     * Load a file as a Resource with Path Traversal protection
     * @param filePath The relative path to the file (e.g., "report-videos/filename.mp4")
     * @return Resource object
     * @throws IOException if file cannot be loaded
     */
    public Resource loadFileAsResource(String filePath) throws IOException {
        try {
            Path basePath = Paths.get(uploadDir).toAbsolutePath().normalize();
            Path path = basePath.resolve(filePath).normalize();

            // Chống Path Traversal: Đảm bảo đường dẫn luôn nằm bên trong thư mục uploadDir
            if (!path.startsWith(basePath)) {
                throw new SecurityException("Không được phép truy cập file ngoài thư mục upload: " + filePath);
            }

            Resource resource = new UrlResource(path.toUri());
            if (resource.exists() && resource.isReadable()) {
                return resource;
            } else {
                throw new IOException("File not found: " + filePath);
            }
        } catch (MalformedURLException ex) {
            throw new IOException("File not found: " + filePath, ex);
        }
    }

    /**
     * Check if a file exists
     * @param filePath The relative path to the file
     * @return true if file exists, false otherwise
     */
    public boolean fileExists(String filePath) {
        try {
            Path basePath = Paths.get(uploadDir).toAbsolutePath().normalize();
            Path path = basePath.resolve(filePath).normalize();
            return path.startsWith(basePath) && Files.exists(path);
        } catch (Exception e) {
            return false;
        }
    }

    /**
     * Get file size in bytes
     * @param filePath The relative path to the file
     * @return file size in bytes, or -1 if file doesn't exist
     */
    public long getFileSize(String filePath) {
        try {
            Path basePath = Paths.get(uploadDir).toAbsolutePath().normalize();
            Path path = basePath.resolve(filePath).normalize();
            if (path.startsWith(basePath) && Files.exists(path)) {
                return Files.size(path);
            }
            return -1;
        } catch (IOException e) {
            return -1;
        }
    }
}