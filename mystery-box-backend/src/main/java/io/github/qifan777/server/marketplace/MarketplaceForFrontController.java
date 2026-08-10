package io.github.qifan777.server.marketplace;

import cn.dev33.satoken.stp.StpUtil;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("front/marketplace")
@RequiredArgsConstructor
public class MarketplaceForFrontController {
    private final MarketplaceService marketplaceService;

    @GetMapping("listings")
    public List<MarketplaceService.MarketplaceListingView> listings(
            @RequestParam(defaultValue = "20") int limit,
            @RequestParam(defaultValue = "0") int offset,
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "newest") String sort,
            @RequestParam(required = false) BigDecimal minPrice,
            @RequestParam(required = false) BigDecimal maxPrice
    ) {
        return marketplaceService.listOnSale(limit, offset, keyword, sort, minPrice, maxPrice);
    }

    @GetMapping("purchased")
    public List<MarketplaceService.PurchasedListingView> purchased(
            @RequestParam(defaultValue = "30") int limit
    ) {
        return marketplaceService.listPurchasedByBuyer(StpUtil.getLoginIdAsString(), limit);
    }

    @GetMapping("my-listings")
    public List<MarketplaceService.MarketplaceListingView> myListings(
            @RequestParam(defaultValue = "30") int limit
    ) {
        return marketplaceService.listBySeller(StpUtil.getLoginIdAsString(), limit);
    }

    @PostMapping("listings")
    public String create(@RequestBody @Validated CreateListingRequest request) {
        return marketplaceService.createListing(
                StpUtil.getLoginIdAsString(),
                request.orderId(),
                request.orderItemId(),
                request.productId(),
                request.price()
        );
    }

    @PostMapping("listings/{id}/cancel")
    public void cancel(@PathVariable String id) {
        marketplaceService.cancelListing(StpUtil.getLoginIdAsString(), id);
    }

    @PostMapping("listings/{id}/buy")
    public void buy(@PathVariable String id) {
        marketplaceService.buyListing(StpUtil.getLoginIdAsString(), id);
    }

    public record CreateListingRequest(
            @NotBlank String orderId,
            @NotBlank String orderItemId,
            @NotBlank String productId,
            @NotNull @DecimalMin("0.01") BigDecimal price
    ) {
    }
}
