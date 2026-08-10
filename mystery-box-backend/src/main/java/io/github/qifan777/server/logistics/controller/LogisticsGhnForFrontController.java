package io.github.qifan777.server.logistics.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * GHN address lookup stub — replace with GHN Partner API when credentials are available.
 */
@RestController
@RequestMapping("front/logistics/ghn")
public class LogisticsGhnForFrontController {

    private static final List<GhnProvince> PROVINCES = List.of(
            new GhnProvince("HN", "Thành phố Hà Nội"),
            new GhnProvince("SG", "Thành phố Hồ Chí Minh"),
            new GhnProvince("DN", "Thành phố Đà Nẵng"),
            new GhnProvince("HP", "Thành phố Hải Phòng"),
            new GhnProvince("CT", "Thành phố Cần Thơ")
    );

    @GetMapping("provinces")
    public List<GhnProvince> provinces() {
        return PROVINCES;
    }

    @GetMapping("districts")
    public List<GhnDistrict> districts(@RequestParam String provinceCode) {
        if ("SG".equalsIgnoreCase(provinceCode)) {
            return List.of(
                    new GhnDistrict("Q1", "Quận 1"),
                    new GhnDistrict("Q3", "Quận 3"),
                    new GhnDistrict("Q7", "Quận 7")
            );
        }
        return List.of(new GhnDistrict("DEFAULT", "Quận/Huyện"));
    }

    @GetMapping("wards")
    public List<GhnWard> wards(@RequestParam String districtCode) {
        return List.of(
                new GhnWard("W1", "Phường " + districtCode),
                new GhnWard("W2", "Phường trung tâm")
        );
    }

    public record GhnProvince(String code, String name) {
    }

    public record GhnDistrict(String code, String name) {
    }

    public record GhnWard(String code, String name) {
    }
}
