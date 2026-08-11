package io.github.qifan777.server.box.root.service;

import io.github.qifan777.server.box.draw.BoxExpectedValueGuard;
import io.github.qifan777.server.box.product.service.PrizeStockService;
import io.github.qifan777.server.box.root.entity.MysteryBox;
import io.github.qifan777.server.box.root.entity.MysteryBoxTable;
import io.github.qifan777.server.box.root.repository.MysteryBoxRepository;
import io.github.qifan777.server.infrastructure.money.MoneyRounding;
import io.github.qifan777.server.payment.config.MarketProperties;
import io.github.qifan777.server.product.root.entity.Product;
import io.github.qifan777.server.referral.service.ReferralService;
import io.github.qifan777.server.risk.service.RiskControlService;
import io.qifan.infrastructure.common.constants.ResultCode;
import io.qifan.infrastructure.common.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class NewcomerBoxService {

    /** Default first-draw subsidy (CNY); VND uses {@link #defaultFirstDrawPrice()}. */
    public static final BigDecimal NEWCOMER_FIRST_DRAW_PRICE = new BigDecimal("0.01");
    public static final BigDecimal NEWCOMER_FIRST_DRAW_PRICE_VND = new BigDecimal("1000");

    private final MysteryBoxRepository mysteryBoxRepository;
    private final ReferralService referralService;
    private final PrizeStockService prizeStockService;
    private final BoxExpectedValueGuard boxExpectedValueGuard;
    private final RiskControlService riskControlService;
    private final MarketProperties marketProperties;

    @Value("${app.newcomer.first-draw-price:0.01}")
    private BigDecimal firstDrawPrice = NEWCOMER_FIRST_DRAW_PRICE;

    @Value("${app.newcomer.max-ev-cost:50}")
    private BigDecimal maxEvCost = new BigDecimal("50");

    @Value("${app.newcomer.enabled:true}")
    private boolean subsidyEnabled = true;

    @Value("${app.newcomer.device-cluster-guard:true}")
    private boolean deviceClusterGuard = true;

    public MysteryBox getNewcomerOfferBox() {
        MysteryBoxTable table = MysteryBoxTable.$;
        var fetcher = MysteryBoxRepository.COMPLEX_FETCHER_FOR_FRONT;
        var exclusiveCandidates = mysteryBoxRepository.sql().createQuery(table)
                .where(table.newcomerExclusive().eq(true))
                .orderBy(table.price().asc(), table.createdTime().asc())
                .select(table.fetch(fetcher))
                .execute();
        for (MysteryBox box : exclusiveCandidates) {
            if (hasDrawableStock(box.id())) {
                return box;
            }
        }
        var allByPrice = mysteryBoxRepository.sql().createQuery(table)
                .orderBy(table.price().asc(), table.createdTime().asc())
                .select(table.fetch(fetcher))
                .execute();
        for (MysteryBox box : allByPrice) {
            if (hasDrawableStock(box.id())) {
                return box;
            }
        }
        throw new BusinessException(ResultCode.NotFindError, "暂无可用盲盒，请联系管理员");
    }

    private boolean hasDrawableStock(String mysteryBoxId) {
        try {
            prizeStockService.assertStockAvailable(mysteryBoxId, 1);
            mysteryBoxRepository.assertPoolAvailable(mysteryBoxId, 1);
            return true;
        } catch (BusinessException ignored) {
            return false;
        }
    }

    /** 新人专享盲盒所有人可买；首抽特惠价仅对未开盒用户且单抽生效。 */
    public void assertCanPurchase(String userId, String mysteryBoxId) {
        mysteryBoxRepository.findById(mysteryBoxId)
                .orElseThrow(() -> new BusinessException(ResultCode.NotFindError, "盲盒不存在"));
    }

    public boolean qualifiesForNewcomerFirstDrawPrice(String userId, MysteryBox box, int drawCount) {
        if (!subsidyEnabled) {
            return false;
        }
        if (box == null || !box.newcomerExclusive() || drawCount != 1 || !referralService.isNewcomer(userId)) {
            return false;
        }
        if (deviceClusterGuard && riskControlService.linkedDevicesHaveOtherPaidUsers(userId)) {
            log.info("Newcomer subsidy skipped: device cluster already has paid users userId={}", userId);
            return false;
        }
        return withinEvBudget(box);
    }

    public BigDecimal resolveLineProductAmount(String userId, MysteryBox box, int drawCount, BigDecimal batchDiscountedTotal) {
        if (qualifiesForNewcomerFirstDrawPrice(userId, box, drawCount)) {
            BigDecimal price = firstDrawPrice == null || firstDrawPrice.compareTo(BigDecimal.ZERO) < 0
                    ? defaultFirstDrawPrice()
                    : firstDrawPrice;
            return MoneyRounding.round(price, marketProperties.getCurrency());
        }
        return batchDiscountedTotal;
    }

    private BigDecimal defaultFirstDrawPrice() {
        return marketProperties.isVndMarket() ? NEWCOMER_FIRST_DRAW_PRICE_VND : NEWCOMER_FIRST_DRAW_PRICE;
    }

    /**
     * Refuse subsidy when expected prize cost exceeds {@code app.newcomer.max-ev-cost}
     * (0 or negative disables the EV ceiling).
     */
    private boolean withinEvBudget(MysteryBox box) {
        if (maxEvCost == null || maxEvCost.compareTo(BigDecimal.ZERO) <= 0) {
            return true;
        }
        try {
            MysteryBox loaded = ensureProducts(box);
            List<Product> products = loaded.products() == null ? List.of() : new ArrayList<>(loaded.products());
            if (products.isEmpty()) {
                return false;
            }
            BigDecimal ev = boxExpectedValueGuard.expectedPrizeValue(
                    loaded.legendaryRate(), loaded.hiddenRate(), loaded.generalRate(), products);
            if (ev.compareTo(maxEvCost) > 0) {
                log.info(
                        "Newcomer subsidy skipped: boxId={} ev={} > maxEvCost={}",
                        loaded.id(), ev, maxEvCost);
                return false;
            }
            return true;
        } catch (Exception ex) {
            log.warn("Newcomer EV budget check failed boxId={}: {}", box.id(), ex.getMessage());
            return false;
        }
    }

    private MysteryBox ensureProducts(MysteryBox box) {
        if (box.products() != null && !box.products().isEmpty()) {
            return box;
        }
        return mysteryBoxRepository.findById(box.id(), MysteryBoxRepository.COMPLEX_FETCHER_FOR_FRONT)
                .orElse(box);
    }
}
