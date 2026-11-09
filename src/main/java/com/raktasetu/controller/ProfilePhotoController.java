
package com.raktasetu.controller;

import com.raktasetu.model.User;
import com.raktasetu.repository.UserRepository;

import org.springframework.http.*;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.nio.file.*;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/me/photo")
public class ProfilePhotoController {

    private static final long MAX_SIZE = 2 * 1024 * 1024;

    private final UserRepository users;

    private final Path uploadDir = Paths.get(
            "uploads", "profile-photos"
    ).toAbsolutePath().normalize();

    public ProfilePhotoController(UserRepository users) {
        this.users = users;
    }

    private User current(Authentication auth) {

        if (auth == null || !auth.isAuthenticated()) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED
            );
        }

        return users.findByEmailIgnoreCase(auth.getName())
                .orElseThrow(() ->
                        new ResponseStatusException(
                                HttpStatus.UNAUTHORIZED
                        )
                );
    }

    private Path photoPath(User user) {

        if (user.profilePhoto == null ||
                user.profilePhoto.isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "No profile photo"
            );
        }

        Path path = uploadDir.resolve(
                user.profilePhoto
        ).normalize();

        if (!path.getParent().equals(uploadDir)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST
            );
        }

        return path;
    }

    private String detectExtension(byte[] data) {

        if (data.length >= 3
                && (data[0] & 255) == 0xFF
                && (data[1] & 255) == 0xD8
                && (data[2] & 255) == 0xFF) {
            return ".jpg";
        }

        if (data.length >= 8
                && (data[0] & 255) == 0x89
                && data[1] == 'P'
                && data[2] == 'N'
                && data[3] == 'G'
                && (data[4] & 255) == 13
                && (data[5] & 255) == 10
                && (data[6] & 255) == 26
                && (data[7] & 255) == 10) {
            return ".png";
        }

        if (data.length >= 12
                && data[0] == 'R'
                && data[1] == 'I'
                && data[2] == 'F'
                && data[3] == 'F'
                && data[8] == 'W'
                && data[9] == 'E'
                && data[10] == 'B'
                && data[11] == 'P') {
            return ".webp";
        }

        throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Only JPG, PNG and WebP images are allowed"
        );
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public Map<String, String> upload(
            Authentication auth,
            @RequestParam("file") MultipartFile file)
            throws IOException {

        User user = current(auth);

        if (file.isEmpty() || file.getSize() > MAX_SIZE) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Photo must be between 1 byte and 2 MB"
            );
        }

        byte[] data = file.getBytes();

        String extension = detectExtension(data);

        String filename = UUID.randomUUID() + extension;

        Files.createDirectories(uploadDir);

        Path destination = uploadDir.resolve(filename);

        Files.write(
                destination,
                data,
                StandardOpenOption.CREATE_NEW
        );

        String oldFilename = user.profilePhoto;

        try {
            user.profilePhoto = filename;
            users.save(user);
        } catch (RuntimeException ex) {
            Files.deleteIfExists(destination);
            throw ex;
        }

        if (oldFilename != null) {
            Path oldPath = uploadDir.resolve(oldFilename)
                    .normalize();

            if (oldPath.getParent().equals(uploadDir)) {
                Files.deleteIfExists(oldPath);
            }
        }

        return Map.of(
                "message", "Profile photo updated successfully"
        );
    }

    @GetMapping
    public ResponseEntity<byte[]> getPhoto(
            Authentication auth) throws IOException {

        User user = current(auth);

        Path path = photoPath(user);

        if (!Files.isRegularFile(path)) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND
            );
        }

        String filename = path.getFileName().toString()
                .toLowerCase();

        MediaType type;

        if (filename.endsWith(".png")) {
            type = MediaType.IMAGE_PNG;
        } else if (filename.endsWith(".webp")) {
            type = MediaType.parseMediaType("image/webp");
        } else {
            type = MediaType.IMAGE_JPEG;
        }

        return ResponseEntity.ok()
                .contentType(type)
                .cacheControl(CacheControl.noStore())
                .body(Files.readAllBytes(path));
    }

    @DeleteMapping
    public Map<String, String> remove(
            Authentication auth) throws IOException {

        User user = current(auth);

        if (user.profilePhoto != null) {
            Path path = photoPath(user);

            user.profilePhoto = null;
            users.save(user);

            Files.deleteIfExists(path);
        }

        return Map.of(
                "message", "Profile photo removed"
        );
    }
}
