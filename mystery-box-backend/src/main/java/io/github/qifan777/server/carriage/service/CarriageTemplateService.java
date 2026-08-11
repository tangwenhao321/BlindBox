package io.github.qifan777.server.carriage.service;

import io.github.qifan777.server.address.entity.Address;
import io.github.qifan777.server.address.repository.AddressRepository;
import io.github.qifan777.server.carriage.entity.model.CarriageConfig;
import io.github.qifan777.server.carriage.repository.CarriageTemplateRepository;
import io.github.qifan777.server.infrastructure.money.MoneyRounding;
import io.github.qifan777.server.payment.config.MarketProperties;
import io.qifan.infrastructure.common.exception.BusinessException;
import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Optional;

@Service
@Slf4j
@AllArgsConstructor
@Transactional
public class CarriageTemplateService {
    private final CarriageTemplateRepository carriageTemplateRepository;
    private final AddressRepository addressRepository;
    private final MarketProperties marketProperties;

    public BigDecimal calculate(String addressId, BigDecimal productAmount) {
        Optional<Address> userAddressOpt = addressRepository.findUserAddressById(addressId);
        if (userAddressOpt.isEmpty()) return BigDecimal.ZERO;
        Address address = userAddressOpt.get();
        List<CarriageConfig> configs = carriageTemplateRepository.findValidForMarket(marketProperties.isVndMarket()).configs();
        Optional<CarriageConfig> matched = configs.stream()
                .filter(config -> matchesProvince(config, address))
                .findFirst();
        if (matched.isEmpty() && marketProperties.isVndMarket() && !configs.isEmpty()) {
            matched = Optional.of(configs.get(0));
        }
        CarriageConfig config = matched.orElseThrow(() -> new BusinessException("当前省份不支持发货请联系客服"));
        var priceRanges = config.getPriceRanges();
        Optional<CarriageConfig.PriceRange> matchedRange = priceRanges
                .stream()
                .filter(priceRange -> productAmount.compareTo(priceRange.getMinPrice()) >= 0
                        && productAmount.compareTo(priceRange.getMaxPrice()) <= 0)
                .findFirst();
        if (matchedRange.isEmpty() && marketProperties.isVndMarket() && !priceRanges.isEmpty()) {
            matchedRange = priceRanges.stream().max(Comparator.comparing(r -> r.getMaxPrice()));
        }
        return MoneyRounding.round(
                matchedRange
                        .orElseThrow(() -> new BusinessException("运费模板不适应与该订单，请联系客服"))
                        .getCarriage(),
                marketProperties.getCurrency());
    }

    private boolean matchesProvince(CarriageConfig config, Address address) {
        if (config.getProvince() == null || config.getProvince().isEmpty()) {
            return false;
        }
        String province = address.province() == null ? "" : address.province().trim();
        String details = address.details() == null ? "" : address.details().trim();
        String detailsLower = details.toLowerCase(Locale.ROOT);
        for (String configured : config.getProvince()) {
            if (!StringUtils.hasText(configured)) {
                continue;
            }
            if ("*".equals(configured.trim())) {
                return true;
            }
            String name = configured.trim();
            String nameLower = name.toLowerCase(Locale.ROOT);
            if (province.equalsIgnoreCase(name)) {
                return true;
            }
            if (StringUtils.hasText(province)
                    && (province.toLowerCase(Locale.ROOT).contains(nameLower)
                    || nameLower.contains(province.toLowerCase(Locale.ROOT)))) {
                return true;
            }
            if (StringUtils.hasText(details)
                    && (detailsLower.startsWith(nameLower) || detailsLower.contains(nameLower))) {
                return true;
            }
        }
        return false;
    }

}
