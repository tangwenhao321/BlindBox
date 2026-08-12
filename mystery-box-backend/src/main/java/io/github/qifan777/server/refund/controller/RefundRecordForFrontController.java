package io.github.qifan777.server.refund.controller;

import cn.dev33.satoken.stp.StpUtil;
import io.github.qifan777.server.infrastructure.model.QueryRequest;
import io.github.qifan777.server.infrastructure.security.FrontOwnership;
import io.github.qifan777.server.refund.entity.RefundRecord;
import io.github.qifan777.server.refund.entity.dto.RefundRecordInput;
import io.github.qifan777.server.refund.entity.dto.RefundRecordSpec;
import io.github.qifan777.server.refund.repository.RefundRecordRepository;
import io.github.qifan777.server.refund.service.RefundRecordService;
import io.qifan.infrastructure.common.exception.BusinessException;
import lombok.AllArgsConstructor;
import org.babyfish.jimmer.client.FetchBy;
import org.babyfish.jimmer.client.meta.DefaultFetcherOwner;
import org.springframework.data.domain.Page;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("front/refund-record")
@AllArgsConstructor
@DefaultFetcherOwner(RefundRecordRepository.class)
@Transactional
public class RefundRecordForFrontController {
    private final RefundRecordRepository refundRecordRepository;
    private final RefundRecordService refundRecordService;

    @GetMapping("{id}")
    public @FetchBy(value = "COMPLEX_FETCHER_FOR_FRONT") RefundRecord findById(@PathVariable String id) {
        RefundRecord refundRecord = refundRecordRepository.findById(id, RefundRecordRepository.COMPLEX_FETCHER_FOR_FRONT)
                .orElseThrow(() -> new BusinessException("数据不存在"));
        FrontOwnership.assertSelf(refundRecord.creator().id());
        return refundRecord;
    }

    @PostMapping("query")
    public Page<@FetchBy(value = "COMPLEX_FETCHER_FOR_FRONT") RefundRecord> query(@RequestBody QueryRequest<RefundRecordSpec> queryRequest) {
        queryRequest.getQuery().setCreatorId(StpUtil.getLoginIdAsString());
        return refundRecordRepository.findPage(queryRequest, RefundRecordRepository.COMPLEX_FETCHER_FOR_FRONT);
    }

    /** Create-only. Updates that change amount/status are forbidden. */
    @PostMapping("save")
    public String save(@RequestBody @Validated RefundRecordInput refundRecordInput) {
        if (StringUtils.hasText(refundRecordInput.getId())) {
            throw new BusinessException("REFUND_UPDATE_FORBIDDEN: 退款申请创建后不可修改，请联系客服");
        }
        return refundRecordService.apply(
                StpUtil.getLoginIdAsString(),
                refundRecordInput.getOrderId(),
                refundRecordInput.getReason(),
                refundRecordInput.getAmount()
        );
    }

    @GetMapping("{id}/timeline")
    public List<RefundRecordService.RefundTimelineEvent> timeline(@PathVariable String id) {
        return refundRecordService.timeline(id, StpUtil.getLoginIdAsString());
    }

    @DeleteMapping
    public Boolean delete(@RequestBody List<String> ids) {
        throw new BusinessException("REFUND_DELETE_FORBIDDEN: 退款记录不可删除");
    }
}
