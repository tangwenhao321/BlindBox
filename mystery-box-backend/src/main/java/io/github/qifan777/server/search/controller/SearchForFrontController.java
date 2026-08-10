package io.github.qifan777.server.search.controller;

import cn.dev33.satoken.annotation.SaIgnore;
import io.github.qifan777.server.search.service.SearchHotKeywordService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("front/search")
@RequiredArgsConstructor
public class SearchForFrontController {
    private final SearchHotKeywordService searchHotKeywordService;

    @SaIgnore
    @GetMapping("hot-keywords")
    public List<String> hotKeywords(@RequestParam(defaultValue = "8") int limit) {
        return searchHotKeywordService.hotKeywords(limit);
    }
}
