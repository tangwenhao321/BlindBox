package io.github.qifan777.server.payment.controller;

import cn.dev33.satoken.stp.StpUtil;
import io.github.qifan777.server.box.order.OrderIdLookupService;
import io.github.qifan777.server.infrastructure.model.QueryRequest;
import io.github.qifan777.server.infrastructure.security.FrontOwnership;
import io.github.qifan777.server.payment.entity.Payment;
import io.github.qifan777.server.payment.entity.dto.PaymentSpec;
import io.github.qifan777.server.payment.repository.PaymentRepository;
import io.qifan.infrastructure.common.exception.BusinessException;
import lombok.AllArgsConstructor;
import org.babyfish.jimmer.client.FetchBy;
import org.babyfish.jimmer.client.meta.DefaultFetcherOwner;
import org.springframework.data.domain.Page;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("front/payment")
@AllArgsConstructor
@DefaultFetcherOwner(PaymentRepository.class)
@Transactional
public class PaymentForFrontController {
    private final PaymentRepository paymentRepository;
    private final OrderIdLookupService orderIdLookupService;

    @GetMapping("{id}")
    public @FetchBy(value = "COMPLEX_FETCHER_FOR_FRONT") Payment findById(@PathVariable String id) {
        String resolved = orderIdLookupService.resolveCurrentId(id);
        Payment payment = paymentRepository.findById(resolved, PaymentRepository.COMPLEX_FETCHER_FOR_FRONT)
                .orElseThrow(() -> new BusinessException("数据不存在"));
        FrontOwnership.assertSelf(payment.creator().id());
        return payment;
    }

    @PostMapping("query")
    public Page<@FetchBy(value = "COMPLEX_FETCHER_FOR_FRONT") Payment> query(@RequestBody QueryRequest<PaymentSpec> queryRequest) {
        queryRequest.getQuery().setCreatorId(StpUtil.getLoginIdAsString());
        return paymentRepository.findPage(queryRequest, PaymentRepository.COMPLEX_FETCHER_FOR_FRONT);
    }
}
