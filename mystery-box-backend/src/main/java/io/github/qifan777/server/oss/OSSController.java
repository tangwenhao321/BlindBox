package io.github.qifan777.server.oss;

import cn.dev33.satoken.stp.StpUtil;
import io.qifan.infrastructure.common.exception.BusinessException;
import io.qifan.infrastructure.oss.service.OSSService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("oss")
@RequiredArgsConstructor
public class OSSController {
    private final ObjectProvider<OSSService> ossService;
    private final ObjectProvider<LocalFileStorageService> localFileStorageService;

    @PostMapping("upload")
    public String upload(@RequestParam("file") MultipartFile file) {
        StpUtil.checkLogin();
        // oss.provider=local 时优先走项目内 LocalFileStorageService
        LocalFileStorageService local = localFileStorageService.getIfAvailable();
        if (local != null) {
            return local.upload(file);
        }
        OSSService remote = ossService.getIfAvailable();
        if (remote != null) {
            return remote.upload(file);
        }
        throw new BusinessException("未配置 OSS：请在 application-private.yml 设置 oss.provider=local 或配置阿里云 OSS");
    }
}
