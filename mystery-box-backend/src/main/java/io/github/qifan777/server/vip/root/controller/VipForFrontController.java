package io.github.qifan777.server.vip.root.controller;

import cn.dev33.satoken.stp.StpUtil;
import io.github.qifan777.server.Objects;
import io.github.qifan777.server.infrastructure.model.QueryRequest;
import io.github.qifan777.server.vip.root.entity.Vip;
import io.github.qifan777.server.vip.root.entity.dto.VipSpec;
import io.github.qifan777.server.vip.root.repository.VipRepository;
import io.qifan.infrastructure.common.exception.BusinessException;
import lombok.AllArgsConstructor;
import org.babyfish.jimmer.client.FetchBy;
import org.babyfish.jimmer.client.meta.DefaultFetcherOwner;
import org.springframework.data.domain.Page;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("front/vip")
@AllArgsConstructor
@DefaultFetcherOwner(VipRepository.class)
@Transactional
public class VipForFrontController {
    private final VipRepository vipRepository;

    @GetMapping
    public @FetchBy(value = "COMPLEX_FETCHER_FOR_FRONT") Vip find() {
        return vipRepository.findCurrentUserVip().orElse(Objects.createVip(draft -> {
        }));
    }

    @PostMapping("query")
    public Page<@FetchBy(value = "COMPLEX_FETCHER_FOR_FRONT") Vip> query(@RequestBody QueryRequest<VipSpec> queryRequest) {
        queryRequest.getQuery().setCreatorId(StpUtil.getLoginIdAsString());
        return vipRepository.findPage(queryRequest, VipRepository.COMPLEX_FETCHER_FOR_FRONT);
    }
}
