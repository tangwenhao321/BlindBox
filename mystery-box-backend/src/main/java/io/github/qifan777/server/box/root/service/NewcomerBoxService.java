package io.github.qifan777.server.box.root.service;

import io.github.qifan777.server.box.product.service.PrizeStockService;
import io.github.qifan777.server.box.root.entity.MysteryBox;
import io.github.qifan777.server.box.root.entity.MysteryBoxTable;
import io.github.qifan777.server.box.root.repository.MysteryBoxRepository;
import io.github.qifan777.server.referral.service.ReferralService;
import io.qifan.infrastructure.common.constants.ResultCode;
import io.qifan.infrastructure.common.exception.BusinessException;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

@Service
@AllArgsConstructor
@Transactional
public class NewcomerBoxService {

    public static final BigDecimal NEWCOMER_FIRST_DRAW_PRICE = new BigDecimal("0.01");
    private final MysteryBoxRepository mysteryBoxRepository;
    private final ReferralService referralService;
    private final PrizeStockService prizeStockService;

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
        return box.newcomerExclusive()
                && drawCount == 1
                && referralService.isNewcomer(userId);
    }

    public BigDecimal resolveLineProductAmount(String userId, MysteryBox box, int drawCount, BigDecimal batchDiscountedTotal) {
        if (qualifiesForNewcomerFirstDrawPrice(userId, box, drawCount)) {
            return NEWCOMER_FIRST_DRAW_PRICE;
        }
        return batchDiscountedTotal;
    }
}
