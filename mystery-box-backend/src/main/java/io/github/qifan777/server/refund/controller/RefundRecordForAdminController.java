package io.github.qifan777.server.refund.controller;

import cn.dev33.satoken.annotation.SaCheckPermission;
import io.github.qifan777.server.infrastructure.model.QueryRequest;
import io.github.qifan777.server.refund.entity.RefundRecord;
import io.github.qifan777.server.refund.entity.dto.RefundRecordInput;
import io.github.qifan777.server.refund.entity.dto.RefundRecordSpec;
import io.github.qifan777.server.refund.repository.RefundRecordRepository;
import io.github.qifan777.server.infrastructure.security.AdminActionOtpVerifier;
import io.github.qifan777.server.refund.service.RefundRecordService;
import io.qifan.infrastructure.common.exception.BusinessException;
import lombok.AllArgsConstructor;
import org.babyfish.jimmer.client.FetchBy;
import org.babyfish.jimmer.client.meta.DefaultFetcherOwner;
import org.springframework.data.domain.Page;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("admin/refund-record")
@AllArgsConstructor
@DefaultFetcherOwner(RefundRecordRepository.class)
@SaCheckPermission("/refund-record")
@Transactional
public class RefundRecordForAdminController {
    private final RefundRecordRepository refundRecordRepository;
    private final RefundRecordService refundRecordService;
    private final AdminActionOtpVerifier adminActionOtpVerifier;

    @GetMapping("{id}")
    public @FetchBy(value = "COMPLEX_FETCHER_FOR_ADMIN") RefundRecord findById(@PathVariable String id) {
        return refundRecordRepository.findById(id, RefundRecordRepository.COMPLEX_FETCHER_FOR_ADMIN).orElseThrow(() -> new BusinessException("数据不存在"));
    }

    @PostMapping("query")
    public Page<@FetchBy(value = "COMPLEX_FETCHER_FOR_ADMIN") RefundRecord> query(@RequestBody QueryRequest<RefundRecordSpec> queryRequest) {
        return refundRecordRepository.findPage(queryRequest, RefundRecordRepository.COMPLEX_FETCHER_FOR_ADMIN);
    }

    @PostMapping("query-enriched")
    public Page<RefundRecordService.RefundAdminRow> queryEnriched(@RequestBody QueryRequest<RefundRecordSpec> queryRequest) {
        return refundRecordService.queryAdminPage(queryRequest);
    }

    @PostMapping("save")
    public String save(@RequestBody @Validated RefundRecordInput refundRecordInput,
                       @RequestHeader(value = "x-admin-action-otp", required = false) String otp) {
        adminActionOtpVerifier.assertValid(otp);
        return refundRecordRepository.save(refundRecordInput.toEntity()).id();
    }

    @PostMapping("{id}/approve")
    public void approve(@PathVariable String id,
                        @RequestHeader(value = "x-admin-action-otp", required = false) String otp) {
        adminActionOtpVerifier.assertValid(otp);
        refundRecordService.approve(id);
    }

    @PostMapping("{id}/reject")
    public void reject(@PathVariable String id,
                       @RequestBody(required = false) RejectRequest body,
                       @RequestHeader(value = "x-admin-action-otp", required = false) String otp) {
        adminActionOtpVerifier.assertValid(otp);
        refundRecordService.reject(id, body == null ? null : body.reason());
    }

    public record RejectRequest(String reason) {
    }

    @DeleteMapping
    public Boolean delete(@RequestBody List<String> ids,
                          @RequestHeader(value = "x-admin-action-otp", required = false) String otp) {
        adminActionOtpVerifier.assertValid(otp);
        refundRecordRepository.deleteAllById(ids);
        return true;
    }
}