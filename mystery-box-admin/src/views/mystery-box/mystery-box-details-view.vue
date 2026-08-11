<script setup lang="ts">
import { computed, onActivated, onBeforeUnmount, onMounted, provide, reactive, ref } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import {
  ElMessage,
  ElMessageBox,
  type FormInstance,
  type FormRules,
  type TabsPaneContext
} from 'element-plus'
import type { MysteryBoxInput } from '@/apis/__generated/model/static'
import ImageUpload from '@/components/image/image-upload.vue'
import { assertFormValidate } from '@/utils/common'
import { api } from '@/utils/api-instance'
import { useFormHelper } from '@/components/base/form/form-helper'
import { useTableHelper } from '@/components/base/table/table-helper'
import type { MysteryBoxDto } from '@/apis/__generated/model/dto'
import SelectedProduct from '@/views/mystery-box/components/selected-product.vue'
import UnselectedProduct from '@/views/mystery-box/components/unselected-product.vue'
import PrizeStockPanel from '@/views/mystery-box/components/prize-stock-panel.vue'
import ProbabilityHistoryPanel from '@/views/mystery-box/components/probability-history-panel.vue'
import PrizeStockAuditPanel from '@/views/mystery-box/components/prize-stock-audit-panel.vue'
import { mysteryBoxCategoryQueryOptions } from '@/views/mystery-box-category/mystery-box-category'
import RemoteSelect from '@/components/base/form/remote-select.vue'
const props = defineProps<{ id?: string }>()
type MysteryBoxForm = MysteryBoxInput & {
  legendaryRate: number
  hiddenRate: number
  generalRate: number
  legendaryRatePercent: number
  hiddenRatePercent: number
  generalRatePercent: number
}

let productTableHelper = useTableHelper(
  api.productForAdminController.query,
  api.productForAdminController,
  { boxId: props.id }
)
provide('productTableHelper', productTableHelper)
const formRef = ref<FormInstance>()
const initForm: MysteryBoxForm = {
  productIds: [],
  cover: '',
  details: '',
  name: '',
  price: 0,
  tips: '',
  categoryId: '',
  legendaryRate: 13,
  hiddenRate: 746,
  generalRate: 9241,
  legendaryRatePercent: 0.13,
  hiddenRatePercent: 7.46,
  generalRatePercent: 92.41,
  pityThreshold: 50
}
const box = ref<MysteryBoxDto['MysteryBoxRepository/COMPLEX_FETCHER_FOR_ADMIN']>()
const { formData: form, restForm } = useFormHelper<MysteryBoxForm>(initForm)
const rules = reactive<FormRules<MysteryBoxForm>>({
  name: [{ required: true, message: '请输入盲盒名字', trigger: 'blur' }],
  details: [{ required: true, message: '请输入盲盒详情', trigger: 'blur' }],
  tips: [{ required: true, message: '请输入购买提示', trigger: 'blur' }],
  price: [{ required: true, message: '请输入价格', trigger: 'blur' }],
  legendaryRate: [{ required: true, message: '请输入超神概率', trigger: 'blur' }],
  hiddenRate: [{ required: true, message: '请输入隐藏概率', trigger: 'blur' }],
  generalRate: [{ required: true, message: '请输入普通概率', trigger: 'blur' }],
  legendaryRatePercent: [{ required: true, message: '请输入超神概率(%)', trigger: 'blur' }],
  hiddenRatePercent: [{ required: true, message: '请输入隐藏概率(%)', trigger: 'blur' }],
  generalRatePercent: [{ required: true, message: '请输入普通概率(%)', trigger: 'blur' }],
  pityThreshold: [{ required: true, message: '请输入保底阈值', trigger: 'blur' }],
  cover: [{ required: true, message: '请输入封面', trigger: 'blur' }],
  categoryId: [{ required: true, message: '请选择分类', trigger: 'change' }]
})
const totalPercent = computed(
  () =>
    (form.value.legendaryRatePercent ?? 0) +
    (form.value.hiddenRatePercent ?? 0) +
    (form.value.generalRatePercent ?? 0)
)
const totalRate = computed(
  () =>
    Math.round((form.value.legendaryRatePercent ?? 0) * 100) +
    Math.round((form.value.hiddenRatePercent ?? 0) * 100) +
    Math.round((form.value.generalRatePercent ?? 0) * 100)
)
const ratePreview = computed(() => ({
  legendaryRate: Math.round((form.value.legendaryRatePercent ?? 0) * 100),
  hiddenRate: Math.round((form.value.hiddenRatePercent ?? 0) * 100),
  generalRate: Math.round((form.value.generalRatePercent ?? 0) * 100)
}))
const isRateValid = computed(() => totalRate.value === 10000)
const probabilityDirty = computed(() => {
  if (!props.id || !box.value) return false
  const prev = box.value
  return (
    Math.round((form.value.legendaryRatePercent ?? 0) * 100) !== prev.legendaryRate ||
    Math.round((form.value.hiddenRatePercent ?? 0) * 100) !== prev.hiddenRate ||
    Math.round((form.value.generalRatePercent ?? 0) * 100) !== prev.generalRate
  )
})
const confirmLeaveIfDirty = async (): Promise<boolean> => {
  if (!probabilityDirty.value) return true
  try {
    await ElMessageBox.confirm('概率配置尚未保存，确定离开当前页面？', '未保存的更改', {
      type: 'warning',
      confirmButtonText: '离开',
      cancelButtonText: '继续编辑'
    })
    return true
  } catch {
    return false
  }
}
const onWindowBeforeUnload = (event: BeforeUnloadEvent) => {
  if (!probabilityDirty.value) return
  event.preventDefault()
  event.returnValue = ''
}
onBeforeRouteLeave(async (_to, _from, next) => {
  if (await confirmLeaveIfDirty()) next()
  else next(false)
})
onMounted(() => window.addEventListener('beforeunload', onWindowBeforeUnload))
onBeforeUnmount(() => window.removeEventListener('beforeunload', onWindowBeforeUnload))
const handleConfirm = async () => {
  form.value.legendaryRate = Math.round((form.value.legendaryRatePercent ?? 0) * 100)
  form.value.hiddenRate = Math.round((form.value.hiddenRatePercent ?? 0) * 100)
  form.value.generalRate = Math.round((form.value.generalRatePercent ?? 0) * 100)
  if (!isRateValid.value) {
    ElMessage.error('中奖概率总和必须等于100%')
    return
  }
  if (props.id && box.value) {
    const prev = box.value
    const diffLines = [
      `传说：${(prev.legendaryRate / 100).toFixed(2)}% → ${(
        form.value.legendaryRatePercent ?? 0
      ).toFixed(2)}%`,
      `隐藏：${(prev.hiddenRate / 100).toFixed(2)}% → ${(form.value.hiddenRatePercent ?? 0).toFixed(
        2
      )}%`,
      `普通：${(prev.generalRate / 100).toFixed(2)}% → ${(
        form.value.generalRatePercent ?? 0
      ).toFixed(2)}%`
    ].join('\n')
    try {
      await ElMessageBox.confirm(
        `保存后将写入概率历史，请确认变更：\n\n${diffLines}`,
        '概率变更预览',
        { type: 'warning', confirmButtonText: '确认保存', cancelButtonText: '返回修改' }
      )
    } catch {
      return
    }
  }
  form.value.productIds = productTableHelper.getTableSelectedRows().map((row) => row.id)
  if (box.value) {
    form.value.productIds.push(...box.value.products.map((row) => row.id))
  }
  formRef.value?.validate(
    assertFormValidate(() =>
      api.mysteryBoxForAdminController.save({ body: form.value }).then(async (res) => {
        form.value.id = res
        const threshold = Math.max(1, Math.min(9999, Number(form.value.pityThreshold) || 50))
        await api.mysteryBoxForAdminController.updatePityThreshold({
          id: res,
          body: { pityThreshold: threshold }
        })
        ElMessage.success('操作成功。请在「赏品库存」Tab 配置各赏品余量与终赏。')
        init()
      })
    )
  )
}
const init = () => {
  if (props.id) {
    api.mysteryBoxForAdminController.findById({ id: props.id }).then((res) => {
      form.value = {
        ...res,
        productIds: res.products.map((row) => row.id),
        categoryId: res.category.id,
        legendaryRatePercent: Number((res.legendaryRate / 100).toFixed(2)),
        hiddenRatePercent: Number((res.hiddenRate / 100).toFixed(2)),
        generalRatePercent: Number((res.generalRate / 100).toFixed(2)),
        pityThreshold: res.pityThreshold > 0 ? res.pityThreshold : 50
      }
      box.value = res
    })
    productTableHelper.reloadTableData({ query: { boxId: props.id } })
  } else {
    restForm()
  }
}
onActivated(() => {
  init()
})
const activeName = ref('selected')
</script>

<template>
  <div class="form">
    <el-form labelWidth="120" class="form" ref="formRef" :model="form" :rules="rules">
      <el-form-item label="盲盒名字" prop="name">
        <el-input v-model.trim="form.name"></el-input>
      </el-form-item>
      <el-form-item label="盲盒详情" prop="details">
        <el-input v-model="form.details" type="textarea"></el-input>
      </el-form-item>
      <el-form-item label="购买提示" prop="tips">
        <el-input v-model.trim="form.tips"></el-input>
      </el-form-item>
      <el-form-item label="价格" prop="price">
        <el-input-number v-model="form.price"></el-input-number>
      </el-form-item>
      <el-form-item label="超神概率(%)" prop="legendaryRatePercent">
        <el-input-number
          v-model="form.legendaryRatePercent"
          :min="0"
          :max="100"
          :precision="2"
        ></el-input-number>
      </el-form-item>
      <el-form-item label="隐藏概率(%)" prop="hiddenRatePercent">
        <el-input-number
          v-model="form.hiddenRatePercent"
          :min="0"
          :max="100"
          :precision="2"
        ></el-input-number>
      </el-form-item>
      <el-form-item label="普通概率(%)" prop="generalRatePercent">
        <el-input-number
          v-model="form.generalRatePercent"
          :min="0"
          :max="100"
          :precision="2"
        ></el-input-number>
      </el-form-item>
      <el-form-item label="保底阈值" prop="pityThreshold">
        <el-input-number v-model="form.pityThreshold" :min="1" :max="9999" :step="1"></el-input-number>
        <span class="pity-hint">未出高阶累计抽数达到该值后触发保底（默认 50）</span>
      </el-form-item>
      <el-form-item label="概率合计">
        <el-tag :type="isRateValid ? 'success' : 'danger'"> {{ totalPercent.toFixed(2) }}% </el-tag>
      </el-form-item>
      <el-form-item label="概率换算预览">
        <div class="rate-preview">
          <div class="rate-item">
            超神: <b>{{ ratePreview.legendaryRate }}</b> / 10000
          </div>
          <div class="rate-item">
            隐藏: <b>{{ ratePreview.hiddenRate }}</b> / 10000
          </div>
          <div class="rate-item">
            普通: <b>{{ ratePreview.generalRate }}</b> / 10000
          </div>
          <div class="rate-item total">
            合计: <b>{{ totalRate }}</b> / 10000
          </div>
        </div>
      </el-form-item>
      <el-form-item label="封面" prop="cover">
        <image-upload v-model="form.cover"></image-upload>
      </el-form-item>
      <el-form-item label="类别" prop="categoryId">
        <remote-select
          label-prop="name"
          :query-options="mysteryBoxCategoryQueryOptions"
          v-model="form.categoryId"
        ></remote-select>
      </el-form-item>
      <el-tabs v-model="activeName">
        <el-tab-pane name="selected" label="已选" v-if="box">
          <selected-product v-model:products="box.products"></selected-product>
        </el-tab-pane>
        <el-tab-pane name="unselected" label="待选">
          <unselected-product></unselected-product>
        </el-tab-pane>
        <el-tab-pane name="stock" label="赏品库存" v-if="id">
          <prize-stock-panel :mystery-box-id="id" />
        </el-tab-pane>
        <el-tab-pane name="probHist" label="概率历史" v-if="id">
          <probability-history-panel :mystery-box-id="id" />
        </el-tab-pane>
        <el-tab-pane name="stockAudit" label="库存审计" v-if="id">
          <prize-stock-audit-panel :mystery-box-id="id" />
        </el-tab-pane>
      </el-tabs>
    </el-form>
    <el-row justify="center">
      <el-button type="primary" @click="handleConfirm">提交</el-button>
    </el-row>
  </div>
</template>

<style scoped lang="scss">
.form {
  background: white;
  padding: 20px;
  border-radius: 5px;
}
.rate-preview {
  display: grid;
  grid-template-columns: repeat(2, minmax(220px, 1fr));
  gap: 8px 16px;
  width: 100%;
  .rate-item {
    color: #606266;
  }
  .total {
    color: #303133;
  }
}
.pity-hint {
  margin-left: 12px;
  color: #909399;
  font-size: 12px;
}
</style>
