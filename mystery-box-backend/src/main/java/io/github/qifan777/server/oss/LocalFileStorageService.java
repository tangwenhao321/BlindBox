package io.github.qifan777.server.oss;

import cn.hutool.core.util.IdUtil;
import io.qifan.infrastructure.common.exception.BusinessException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Set;

@Service
@ConditionalOnProperty(name = "oss.provider", havingValue = "local", matchIfMissing = false)
public class LocalFileStorageService {
    private static final Set<String> ALLOWED_EXT = Set.of("png", "jpg", "jpeg", "webp", "gif");

    private final Path baseDir;
    private final String publicBaseUrl;

    public LocalFileStorageService(
            @Value("${oss.local.base-dir:./data/uploads}") String baseDir,
            @Value("${oss.local.public-base-url:/uploads}") String publicBaseUrl
    ) throws IOException {
        this.baseDir = Paths.get(baseDir).toAbsolutePath().normalize();
        String normalized = publicBaseUrl == null ? "/uploads" : publicBaseUrl.trim();
        if (normalized.isEmpty()) {
            normalized = "/uploads";
        }
        this.publicBaseUrl = normalized.endsWith("/") ? normalized.substring(0, normalized.length() - 1) : normalized;
        Files.createDirectories(this.baseDir);
    }

    public String upload(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BusinessException("请选择图片文件");
        }
        String ext = StringUtils.getFilenameExtension(file.getOriginalFilename());
        if (ext == null || !ALLOWED_EXT.contains(ext.toLowerCase())) {
            throw new BusinessException("仅支持 png/jpg/jpeg/webp/gif 图片");
        }
        String contentType = file.getContentType();
        if (contentType != null && !contentType.startsWith("image/")) {
            throw new BusinessException("仅支持图片文件");
        }
        if (file.getSize() > 2 * 1024 * 1024) {
            throw new BusinessException("图片大小不能超过 2MB");
        }
        String filename = IdUtil.fastSimpleUUID() + "." + ext.toLowerCase();
        Path target = baseDir.resolve(filename);
        try {
            file.transferTo(target);
        } catch (IOException ex) {
            throw new BusinessException("图片保存失败: " + ex.getMessage());
        }
        return publicBaseUrl + "/" + filename;
    }
}
