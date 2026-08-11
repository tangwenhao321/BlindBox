package io.github.qifan777.server.logistics.controller;

import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * GHN address lookup — Partner API not wired.
 * Returns empty lists (not hard errors) so mobile cascades degrade gracefully.
 */
@RestController
@RequestMapping("front/logistics/ghn")
@Slf4j
public class LogisticsGhnForFrontController {

    @GetMapping("provinces")
    public List<GhnProvince> provinces() {
        log.debug("GHN provinces stub — Partner API not wired");
        return List.of();
    }

    @GetMapping("districts")
    public List<GhnDistrict> districts(@RequestParam String provinceCode) {
        log.debug("GHN districts stub provinceCode={} — Partner API not wired", provinceCode);
        return List.of();
    }

    @GetMapping("wards")
    public List<GhnWard> wards(@RequestParam String districtCode) {
        log.debug("GHN wards stub districtCode={} — Partner API not wired", districtCode);
        return List.of();
    }

    public record GhnProvince(String code, String name) {
    }

    public record GhnDistrict(String code, String name) {
    }

    public record GhnWard(String code, String name) {
    }
}
