
package io.github.qifan777.server.address.controller;

import cn.dev33.satoken.stp.StpUtil;
import com.fasterxml.jackson.annotation.JsonProperty;

import io.github.qifan777.server.address.entity.Address;
import io.github.qifan777.server.address.entity.AddressDraft;
import io.github.qifan777.server.address.entity.AddressTable;
import io.github.qifan777.server.address.entity.dto.AddressInput;
import io.github.qifan777.server.address.entity.dto.AddressSpec;
import io.github.qifan777.server.address.repository.AddressRepository;
import io.github.qifan777.server.infrastructure.model.QueryRequest;
import io.github.qifan777.server.infrastructure.model.TenantMapProperty;
import io.github.qifan777.server.infrastructure.security.FrontOwnership;
import io.github.qifan777.server.payment.config.MarketProperties;
import io.qifan.infrastructure.common.exception.BusinessException;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.extern.slf4j.Slf4j;
import org.babyfish.jimmer.client.FetchBy;
import org.babyfish.jimmer.client.meta.DefaultFetcherOwner;
import org.babyfish.jimmer.sql.ast.mutation.SaveMode;
import org.springframework.data.domain.Page;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.List;

@RestController
@RequestMapping("front/address")
@AllArgsConstructor
@DefaultFetcherOwner(AddressRepository.class)
@Transactional
@Slf4j
public class AddressForFrontController {
    private final AddressRepository addressRepository;
    private final TenantMapProperty tenantMapProperty;
    private final MarketProperties marketProperties;

    @GetMapping("{id}")
    public @FetchBy(value = "COMPLEX_FETCHER_FOR_FRONT") Address findById(@PathVariable String id) {
        Address address = addressRepository.findById(id, AddressRepository.COMPLEX_FETCHER_FOR_FRONT)
                .orElseThrow(() -> new BusinessException("数据不存在"));
        FrontOwnership.assertSelf(address.creator().id());
        return address;
    }

    @PostMapping("query")
    public Page<@FetchBy(value = "COMPLEX_FETCHER_FOR_FRONT") Address> query(@RequestBody QueryRequest<AddressSpec> queryRequest) {
        queryRequest.getQuery().setCreatorId(StpUtil.getLoginIdAsString());
        return addressRepository.findPage(queryRequest, AddressRepository.COMPLEX_FETCHER_FOR_FRONT);
    }

    @PostMapping("save")
    public String save(@RequestBody @Validated AddressInput addressInput) {
        if (StringUtils.hasText(addressInput.getId())) {
            Address address = addressRepository.findById(addressInput.getId(), AddressRepository.COMPLEX_FETCHER_FOR_FRONT).orElseThrow(() -> new BusinessException("数据不存在"));
            if (!address.creator().id().equals(StpUtil.getLoginIdAsString())) {
                throw new BusinessException("只能修改自己的数据");
            }
        }
        // 首个地址设为默认
        if (addressRepository.findUserAll(StpUtil.getLoginIdAsString()).isEmpty()) {
            addressInput.setTop(true);
        }
        Address entity = AddressDraft.$.produce(addressInput.toEntity(), draft -> {
            String province = nullableField(addressInput.getProvince());
            String city = nullableField(addressInput.getCity());
            String district = nullableField(addressInput.getDistrict());
            boolean skipTencentGeocode = "vnpay".equalsIgnoreCase(marketProperties.getPaymentProvider())
                    || !isUsableMapKey(tenantMapProperty.getKey());
            if (!skipTencentGeocode && (!StringUtils.hasText(province) || !StringUtils.hasText(city))) {
                String details = addressInput.getDetails();
                if (StringUtils.hasText(details) && details.length() <= 200) {
                    try {
                        String encodedAddress = URLEncoder.encode(details.trim(), StandardCharsets.UTF_8);
                        String encodedKey = URLEncoder.encode(
                                String.valueOf(tenantMapProperty.getKey()), StandardCharsets.UTF_8);
                        GeoCoderResponse geoCoderResponse = new RestTemplate().getForObject(
                                "https://apis.map.qq.com/ws/geocoder/v1/?address=" + encodedAddress + "&key=" + encodedKey,
                                GeoCoderResponse.class
                        );
                        if (geoCoderResponse != null
                                && geoCoderResponse.getResult() != null
                                && geoCoderResponse.getResult().getAddressComponents() != null) {
                            GeoCoderResponse.Address addressComponents = geoCoderResponse.getResult().getAddressComponents();
                            if (!StringUtils.hasText(province) && StringUtils.hasText(addressComponents.getProvince())) {
                                province = addressComponents.getProvince();
                            }
                            if (!StringUtils.hasText(city) && StringUtils.hasText(addressComponents.getCity())) {
                                city = addressComponents.getCity();
                            }
                            if (!StringUtils.hasText(district) && StringUtils.hasText(addressComponents.getDistrict())) {
                                district = addressComponents.getDistrict();
                            }
                        }
                    } catch (Exception ex) {
                        log.warn("geocode failed for address details={}, fallback to client fields", details, ex);
                    }
                }
            }
            draft.setProvince(province);
            draft.setCity(city);
            draft.setDistrict(district);
        });
        // Jimmer 0.11+: new entities without @Key / id must use INSERT_ONLY (plain save → 10007).
        SaveMode mode = StringUtils.hasText(addressInput.getId()) ? SaveMode.UPDATE_ONLY : SaveMode.INSERT_ONLY;
        return addressRepository.save(entity, mode).id();
    }

    private static boolean isUsableMapKey(String key) {
        if (!StringUtils.hasText(key)) {
            return false;
        }
        String trimmed = key.trim();
        return !"xxx".equalsIgnoreCase(trimmed) && !"your-key".equalsIgnoreCase(trimmed);
    }

    @DeleteMapping
    public Boolean delete(@RequestBody List<String> ids) {
        addressRepository.findByIds(ids, AddressRepository.COMPLEX_FETCHER_FOR_FRONT).forEach(address -> {
            if (!address.creator().id().equals(StpUtil.getLoginIdAsString())) {
                throw new BusinessException("只能删除自己的数据");
            }
        });
        addressRepository.deleteAllById(ids);
        return true;
    }

    @PostMapping("top")
    public Boolean top(@RequestParam String id) {
        Address address = addressRepository.findById(id, AddressRepository.COMPLEX_FETCHER_FOR_FRONT)
                .orElseThrow(() -> new BusinessException("数据不存在"));
        String loginId = StpUtil.getLoginIdAsString();
        FrontOwnership.assertSelf(address.creator().id());
        AddressTable t = AddressTable.$;
        // 设置该用户的其他地址为非默认
        addressRepository.sql().createUpdate(t)
                .set(t.top(), false)
                .where(t.creator().id().eq(loginId))
                .execute();
        // 仅将本人地址设为默认（带 ownership WHERE，防 IDOR）
        int updated = addressRepository.sql().createUpdate(t)
                .set(t.top(), true)
                .where(t.id().eq(id))
                .where(t.creator().id().eq(loginId))
                .execute();
        if (updated == 0) {
            throw new BusinessException("只能修改自己的数据");
        }
        return true;
    }

    private static String nullableField(String value) {
        return StringUtils.hasText(value) ? value.trim() : "";
    }

    @Data
    public static class GeoCoderResponse {
        private Result result;

        @Data
        public static class Result {
            private Location location;
            @JsonProperty("address_components")
            private Address addressComponents;
        }

        @Data
        public static class Location {
            private Double lat;
            private Double lng;
        }

        @Data
        public static class Address {
            private String province;
            private String city;
            private String district;
            private String street;
        }
    }
}
