package io.github.qifan777.server.box.order.service;



import io.qifan.infrastructure.common.exception.BusinessException;

import lombok.RequiredArgsConstructor;

import org.springframework.beans.factory.annotation.Value;

import org.springframework.jdbc.core.JdbcTemplate;

import org.springframework.stereotype.Service;



import java.sql.Timestamp;

import java.time.LocalDate;

import java.time.ZoneId;

import java.time.ZonedDateTime;



@Service

@RequiredArgsConstructor

public class PurchaseLimitService {

    private static final ZoneId BUSINESS_ZONE = ZoneId.of("Asia/Shanghai");



    private final JdbcTemplate jdbcTemplate;



    @Value("${app.purchase.max-draws-per-box-per-day:100}")

    private int maxDrawsPerBoxPerDay;



    public void assertWithinDailyLimit(String userId, String mysteryBoxId, int additionalDraws) {

        if (maxDrawsPerBoxPerDay <= 0) {

            return;

        }

        int used = countUsedToday(userId, mysteryBoxId);

        if (used + additionalDraws > maxDrawsPerBoxPerDay) {

            throw new BusinessException("今日该盲盒购买次数已达上限（" + maxDrawsPerBoxPerDay + " 次）");

        }

    }



    public int remainingToday(String userId, String mysteryBoxId) {

        if (maxDrawsPerBoxPerDay <= 0) {

            return Integer.MAX_VALUE;

        }

        int used = countUsedToday(userId, mysteryBoxId);

        return Math.max(maxDrawsPerBoxPerDay - used, 0);

    }



    public record PurchaseLimitView(int maxPerDay, int usedToday, int remainingToday) {

    }



    public PurchaseLimitView status(String userId, String mysteryBoxId) {

        if (maxDrawsPerBoxPerDay <= 0) {

            return new PurchaseLimitView(0, 0, Integer.MAX_VALUE);

        }

        int remaining = remainingToday(userId, mysteryBoxId);

        return new PurchaseLimitView(maxDrawsPerBoxPerDay, maxDrawsPerBoxPerDay - remaining, remaining);

    }



    private int countUsedToday(String userId, String mysteryBoxId) {

        ZonedDateTime start = LocalDate.now(BUSINESS_ZONE).atStartOfDay(BUSINESS_ZONE);

        ZonedDateTime end = start.plusDays(1);

        Integer today = jdbcTemplate.queryForObject(

                """

                        SELECT COALESCE(SUM(moi.mystery_box_count), 0)

                        FROM mystery_box_order mbo

                        INNER JOIN mystery_box_order_item moi ON moi.mystery_box_order_id = mbo.id

                        INNER JOIN base_order bo ON bo.id = mbo.id

                        WHERE bo.creator_id = ?

                          AND moi.mystery_box_id = ?

                          AND mbo.status NOT IN ('CANCELED', 'CLOSED', 'TO_BE_PAID')

                          AND bo.created_time >= ? AND bo.created_time < ?

                        """,

                Integer.class,

                userId,

                mysteryBoxId,

                Timestamp.from(start.toInstant()),

                Timestamp.from(end.toInstant())

        );

        return today == null ? 0 : today;

    }

}

