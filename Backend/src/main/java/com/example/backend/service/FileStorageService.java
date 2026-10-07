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
import java.util.UUID;

@Service
public class FileStorageService {

    @Value("${file.upload-dir}")
    private String uploadDir;

    public String storeFile(MultipartFile file, String subDir) throws IOException {
        // Create directory if it doesn't exist
        Path uploadPath = Paths.get(uploadDir + "/" + subDir);
        if (!Files.exists(uploadPath)) {
            Files.createDirectories(uploadPath);
        }

        // Generate unique filename
        String originalFilename = file.getOriginalFilename();
        String extension = originalFilename.substring(originalFilename.lastIndexOf("."));
        String filename = UUID.randomUUID().toString() + extension;

        // Save file
        Path filePath = uploadPath.resolve(filename);
        Files.copy(file.getInputStream(), filePath);

        // Return relative path
        return subDir + "/" + filename;
    }

    public void deleteFile(String filePath) throws IOException {
        Path path = Paths.get(uploadDir + "/" + filePath);
        Files.deleteIfExists(path);
    }

    /**
     * Load a file as a Resource
     * @param filePath The relative path to the file (e.g., "report-videos/filename.mp4")
     * @return Resource object
     * @throws IOException if file cannot be loaded
     */
    public Resource loadFileAsResource(String filePath) throws IOException {
        try {
            Path path = Paths.get(uploadDir + "/" + filePath);
            Resource resource = new UrlResource(path.toUri());
            
            if (resource.exists()) {
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
            Path path = Paths.get(uploadDir + "/" + filePath);
            return Files.exists(path);
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
            Path path = Paths.get(uploadDir + "/" + filePath);
            if (Files.exists(path)) {
                return Files.size(path);
            }
            return -1;
        } catch (IOException e) {
            return -1;
        }
    }
} 