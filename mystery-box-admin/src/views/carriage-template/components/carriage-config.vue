<script setup lang="ts">
import type { CarriageConfig } from '@/apis/__generated/model/static'
import { vietnamProvinceSelectOptions } from '@/data/vietnamProvinces'
import { pcaTextArr } from 'element-china-area-data'
import { Close, Plus } from '@element-plus/icons-vue'
import { computed } from 'vue'

const carriages = defineModel<CarriageConfig[]>({ required: true })
const useVnProvinces = import.meta.env.VITE_MARKET === 'vn'
const provinceOptions = computed(() => {
  if (useVnProvinces) {
    return vietnamProvinceSelectOptions()
  }
  return pcaTextArr.map((option) => ({ label: option.label, value: option.value }))
})
const handleAddPriceRange = (carriage: CarriageConfig) => {
  carriage.priceRanges.push({ minPrice: 0, maxPrice: 0, carriage: 0 })
}
const handleDeletePriceRange = (carriage: CarriageConfig, index: number) => {
  carriage.priceRanges.splice(index, 1)
}
const handleDeleteCarriage = (index: number) => {
  carriages.value.splice(index, 1)
}
const handleAddCarriage = () => {
  carriages.value.push({
    province: [],
    priceRanges: []
  })
}
</script>

<template>
  <div class="carriages-config">
    <p v-if="useVnProvinces" class="vn-hint">
      越南市场：从 63 省/直辖市选择，或使用 <code>*</code> 表示全国统一运费（见 Flyway V20260554）。设置
      <code>VITE_MARKET=vn</code> 启用此列表。
    </p>
    <p v-else class="vn-hint">
      中国省份列表。越南部署请在 Admin 构建环境设置 <code>VITE_MARKET=vn</code>。
    </p>
    <transition-group name="list">
      <div class="carriage" v-for="(carriage, index2) in carriages" :key="index2">
        <el-form size="small" label-width="80" label-position="left">
          <el-form-item label="省份">
            <el-select multiple v-model="carriage.province" collapse-tags>
              <el-option
                v-for="option in provinceOptions"
                :key="option.value"
                :value="option.value"
                :label="option.label"
              ></el-option>
            </el-select>
          </el-form-item>
          <el-form-item label="价格区间">
            <div class="price-config">
              <transition-group name="list">
                <div
                  class="price-range-wrapper"
                  v-for="(priceRange, index) in carriage.priceRanges"
                  :key="index"
                >
                  <el-form class="price-range" label-position="left" label-width="100" size="small">
                    <el-form-item label="订单最低价格">
                      <el-input-number
                        v-model="priceRange.minPrice"
                        :min="0"
                        controls-position="right"
                      ></el-input-number>
                    </el-form-item>
                    <el-form-item label="订单最高价格">
                      <el-input-number
                        v-model="priceRange.maxPrice"
                        :min="0"
                        controls-position="right"
                      ></el-input-number>
                    </el-form-item>
                    <el-form-item label="运费">
                      <el-input-number
                        v-model="priceRange.carriage"
                        controls-position="right"
                      ></el-input-number>
                    </el-form-item>
                  </el-form>
                  <el-button
                    class="close"
                    type="warning"
                    link
                    @click="handleDeletePriceRange(carriage, index)"
                  >
                    <el-icon>
                      <close></close>
                    </el-icon>
                  </el-button>
                </div>
              </transition-group>
            </div>
          </el-form-item>
          <el-form-item label=" ">
            <el-button
              class="add"
              type="primary"
              size="small"
              style="margin-top: 10px"
              @click="handleAddPriceRange(carriage)"
            >
              <el-icon>
                <plus></plus>
              </el-icon>
            </el-button>
          </el-form-item>
        </el-form>
        <el-button class="carriage-close" type="warning" link @click="handleDeleteCarriage(index2)">
          <el-icon>
            <close></close>
          </el-icon>
        </el-button>
      </div>
    </transition-group>
    <el-button
      class="add"
      type="primary"
      size="small"
      style="margin-top: 10px"
      @click="handleAddCarriage"
    >
      <el-icon>
        <plus></plus>
      </el-icon>
    </el-button>
  </div>
</template>

<style scoped lang="scss">
.list-enter-active,
.list-leave-active {
  transition: all 0.5s ease;
}

.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateY(30px);
}

.carriage {
  position: relative;
  margin-top: 10px;
  border: 1px solid rgba(black, 0.1);
  padding: 15px;
  border-radius: 5px;

  .carriage-close {
    position: absolute;
    top: 0;
    right: 0;
  }
}

.price-config {
  display: flex;
  flex-direction: column;

  .price-range-wrapper {
    position: relative;
    margin-top: 10px;
    border: 1px solid rgba(black, 0.1);
    padding: 15px;
    border-radius: 5px;

    .price-range {
      .el-form-item {
        margin-top: 5px;
      }
    }

    .close {
      position: absolute;
      top: 0;
      right: 0;
    }
  }
}
</style>
