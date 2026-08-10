package io.github.qifan777.server.box.order;

import org.springframework.beans.BeansException;
import org.springframework.context.ApplicationContext;
import org.springframework.context.ApplicationContextAware;
import org.springframework.stereotype.Component;

/** Bridges Spring bean into Jimmer repository default methods. */
@Component
public class OrderIdLookupBeans implements ApplicationContextAware {

    private static volatile OrderIdLookupService lookupService;

    @Override
    public void setApplicationContext(ApplicationContext applicationContext) throws BeansException {
        lookupService = applicationContext.getBean(OrderIdLookupService.class);
    }

    public static OrderIdLookupService lookup() {
        return lookupService;
    }
}
