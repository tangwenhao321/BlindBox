<script lang="ts" setup>
import { inject, onMounted } from 'vue'
import request from '@/utils/request'
import { api } from '@/utils/api-instance'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { Scope } from '@/typings'
import type { MysteryBoxOrderDto } from '@/apis/__generated/model/dto'
import { Close, Promotion } from '@element-plus/icons-vue'
import { useTableHelper } from '@/components/base/table/table-helper'
import DictColumn from '@/components/dict/dict-column.vue'
import { DictConstants } from '@/apis/__generated/model/enums/DictConstants'
import { formatAdminMoney } from '@/utils/format-money'

type MysteryBoxOrderScope = Scope<
  MysteryBoxOrderDto['MysteryBoxOrderRepository/COMPLEX_FETCHER_FOR_ADMIN']
>
type MysteryBoxOrderItem =
  MysteryBoxOrderDto['MysteryBoxOrderRepository/COMPLEX_FETCHER_FOR_ADMIN']['items'][0]
type MysteryBoxOrderItemScope = Scope<MysteryBoxOrderItem>
type OrderProduct = NonNullable<MysteryBoxOrderItem['products']>[0]

const itemProducts = (item: MysteryBoxOrderItem): OrderProduct[] => {
  if (item.products?.length) {
    return item.products
  }
  return item.mysteryBox?.products ?? []
}
const mysteryBoxOrderTableHelper = inject(
  'mysteryBoxOrderTableHelper',
  useTableHelper(
    api.mysteryBoxOrderForAdminController.query,
    api.mysteryBoxOrderForAdminController,
    {}
  )
)
const {
  loadTableData,
  handleSortChange,
  handleSelectChange,
  reloadTableData,
  pageData,
  loading,
  queryRequest,
  table
} = mysteryBoxOrderTableHelper
onMounted(() => {
  reloadTableData()
})
const handleClose = async (row: { id: string }) => {
  const otpRes = await ElMessageBox.prompt('请输入高危操作口令', '已支付订单退款', {
    confirmButtonText: '下一步',
    cancelButtonText: '取消',
    inputType: 'password'
  }).catch(() => ({ value: null }))
  if (otpRes.value == null || !String(otpRes.value).trim()) return
  const confirmed = await ElMessageBox.confirm('是否确认退款?', '警告', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).catch(() => false)
  if (!confirmed) return
  await request({
    url: `/admin/mystery-box-order/${row.id}/paid/cancel`,
    method: 'post',
    headers: { 'x-admin-action-otp': String(otpRes.value).trim() }
  })
  ElMessage.success('退款成功')
  reloadTableData()
}
const handleDeliver = async (row: { id: string }) => {
  const trackingRes = await ElMessageBox.prompt('请输入物流单号', '发货', {
    confirmButtonText: '下一步',
    cancelButtonText: '取消'
  }).catch(() => ({ value: null }))
  if (trackingRes.value == null) return
  const carrierRes = await ElMessageBox.prompt(
    '承运商代码（中国：yuantong/shunfeng；越南：ghn/ghtk/viettelpost，默认 auto）',
    '承运商',
    {
      confirmButtonText: '发货',
      cancelButtonText: '取消',
      inputValue: 'auto',
      inputPlaceholder: 'ghn | ghtk | viettelpost | auto'
    }
  ).catch(() => ({ value: 'auto' }))
  request({
    url: `/admin/mystery-box-order/${row.id}/deliver`,
    method: 'post',
    params: {
      trackingNumber: trackingRes.value,
      carrierCode: carrierRes.value || 'auto'
    }
  }).then(() => {
    reloadTableData()
    ElMessage.success('发货成功')
  })
}

const batchImportLogistics = async () => {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.csv,text/csv'
  input.onchange = async () => {
    const file = input.files?.[0]
    if (!file) return
    const text = await file.text()
    const lines = text.split(/\r?\n/).filter((l) => l.trim() && !/^orderId/i.test(l))
    const payload = lines
      .map((line) => {
        const [orderId, trackingNumber, carrierCode] = line.split(',')
        return {
          orderId: orderId?.trim(),
          trackingNumber: trackingNumber?.trim(),
          carrierCode: carrierCode?.trim() || 'auto'
        }
      })
      .filter((l) => l.orderId && l.trackingNumber)
    if (!payload.length) {
      ElMessage.error('CSV 需包含 orderId,trackingNumber 列')
      return
    }
    const res = (await request({
      url: '/admin/mystery-box-order/deliver/batch',
      method: 'post',
      data: payload
    })) as { count: number }
    ElMessage.success(`批量发货 ${res.count} 单`)
    reloadTableData()
  }
  input.click()
}
</script>
<template>
  <div>
    <div style="margin-bottom: 12px">
      <el-button type="primary" @click="batchImportLogistics">批量导入物流 CSV</el-button>
      <span style="margin-left: 8px; color: #64748b; font-size: 13px"
        >格式：orderId,trackingNumber,carrierCode（承运商可省略）</span
      >
    </div>
    <el-table
      ref="table"
      :data="pageData.content"
      :border="true"
      @selection-change="handleSelectChange"
      @sort-change="handleSortChange"
      v-loading="loading"
    >
      <el-table-column type="selection" width="55"></el-table-column>
      <el-table-column type="expand">
        <template v-slot:default="{ row }: MysteryBoxOrderScope">
          <el-table :data="row.items || []" border size="small" class="nested-table">
            <el-table-column type="expand" width="48">
              <template v-slot:default="{ row: itemRow }: MysteryBoxOrderItemScope">
                <el-table :data="itemProducts(itemRow)" border size="small">
                  <el-table-column
                    label="商品名称"
                    prop="name"
                    min-width="160"
                    show-overflow-tooltip
                  />
                  <el-table-column label="封面" width="72">
                    <template v-slot:default="{ row: product }">
                      <el-avatar :src="product.cover" />
                    </template>
                  </el-table-column>
                  <el-table-column label="价格" prop="price" width="110">
                    <template v-slot:default="{ row: product }">
                      {{ formatAdminMoney(product.price) }}
                    </template>
                  </el-table-column>
                  <el-table-column label="品质" prop="qualityType" width="100" />
                </el-table>
              </template>
            </el-table-column>
            <el-table-column label="购买数量" width="90">
              <template v-slot:default="{ row: itemRow }: MysteryBoxOrderItemScope">
                {{ itemRow.mysteryBoxCount }}
              </template>
            </el-table-column>
            <el-table-column label="盲盒名字" show-overflow-tooltip min-width="120">
              <template v-slot:default="{ row: itemRow }: MysteryBoxOrderItemScope">
                {{ itemRow.mysteryBox?.name }}
              </template>
            </el-table-column>
            <el-table-column label="盲盒详情" show-overflow-tooltip min-width="120">
              <template v-slot:default="{ row: itemRow }: MysteryBoxOrderItemScope">
                {{ itemRow.mysteryBox?.details }}
              </template>
            </el-table-column>
            <el-table-column label="购买提示" show-overflow-tooltip min-width="120">
              <template v-slot:default="{ row: itemRow }: MysteryBoxOrderItemScope">
                {{ itemRow.mysteryBox?.tips }}
              </template>
            </el-table-column>
            <el-table-column label="价格" width="110">
              <template v-slot:default="{ row: itemRow }: MysteryBoxOrderItemScope">
                {{ formatAdminMoney(itemRow.mysteryBox?.price) }}
              </template>
            </el-table-column>
            <el-table-column label="封面" width="72">
              <template v-slot:default="{ row: itemRow }: MysteryBoxOrderItemScope">
                <el-avatar :src="itemRow.mysteryBox?.cover" />
              </template>
            </el-table-column>
          </el-table>
        </template>
      </el-table-column>
      <el-table-column
        label="订单状态"
        prop="status"
        sortable="custom"
        min-width="100"
        show-overflow-tooltip
      >
        <template v-slot:default="{ row }: MysteryBoxOrderScope">
          <dict-column
            :dict-id="DictConstants.PRODUCT_ORDER_STATUS"
            :value="row.status"
          ></dict-column>
        </template>
      </el-table-column>
      <el-table-column label="支付详情">
        <el-table-column label="VIP优惠" prop="vipAmount">
          <template v-slot:default="{ row }: MysteryBoxOrderScope">
            {{ formatAdminMoney(row.baseOrder?.payment?.vipAmount) }}
          </template>
        </el-table-column>
        <el-table-column label="邮费" prop="deliveryFee">
          <template v-slot:default="{ row }: MysteryBoxOrderScope">
            {{ formatAdminMoney(row.baseOrder?.payment?.deliveryFee) }}
          </template>
        </el-table-column>
        <el-table-column label="商品金额" prop="productAmount">
          <template v-slot:default="{ row }: MysteryBoxOrderScope">
            {{ formatAdminMoney(row.baseOrder?.payment?.productAmount) }}
          </template>
        </el-table-column>
        <el-table-column label="实付金额" prop="payAmount" sortable="custom">
          <template v-slot:default="{ row }: MysteryBoxOrderScope">
            {{ formatAdminMoney(row.baseOrder?.payment?.payAmount) }}
          </template>
        </el-table-column>
        <el-table-column
          label="支付时间"
          prop="payTime"
          sortable="custom"
          min-width="130"
          show-overflow-tooltip
        >
          <template v-slot:default="{ row }: MysteryBoxOrderScope">
            {{ row.baseOrder?.payment?.payTime }}
          </template>
        </el-table-column>
      </el-table-column>
      <el-table-column label="地址详情">
        <el-table-column label="姓名" prop="realName">
          <template v-slot:default="{ row: { baseOrder } }: MysteryBoxOrderScope">
            {{ baseOrder.address?.realName }}
          </template>
        </el-table-column>
        <el-table-column label="电话" prop="phoneNumber" width="130" show-overflow-tooltip>
          <template v-slot:default="{ row: { baseOrder } }: MysteryBoxOrderScope">
            {{ baseOrder.address?.phoneNumber }}
          </template>
        </el-table-column>
        <el-table-column label="地址信息" prop="address" width="100" show-overflow-tooltip>
          <template v-slot:default="{ row: { baseOrder } }: MysteryBoxOrderScope">
            <div>
              {{ baseOrder.address?.details + ' ' + baseOrder.address?.houseNumber }}
            </div>
          </template>
        </el-table-column>
      </el-table-column>
      <el-table-column
        label="备注"
        prop="remark"
        sortable="custom"
        min-width="100"
        show-overflow-tooltip
      >
        <template v-slot:default="{ row: { baseOrder } }: MysteryBoxOrderScope">
          {{ baseOrder.remark }}
        </template>
      </el-table-column>
      <el-table-column
        label="创建时间"
        prop="createdTime"
        sortable="custom"
        show-overflow-tooltip
        width="150"
      >
        <template v-slot:default="{ row }: MysteryBoxOrderScope">
          {{ row.createdTime }}
        </template>
      </el-table-column>
      <el-table-column
        label="更新时间"
        prop="editedTime"
        sortable="custom"
        show-overflow-tooltip
        width="150"
      >
        <template v-slot:default="{ row }: MysteryBoxOrderScope">
          {{ row.editedTime }}
        </template>
      </el-table-column>
      <el-table-column
        label="创建人"
        prop="creator.phone"
        sortable="custom"
        show-overflow-tooltip
        width="150"
      >
        <template v-slot:default="{ row }: MysteryBoxOrderScope">
          {{ row.creator?.nickname || '-' }}({{ row.creator?.phone || '-' }})
        </template>
      </el-table-column>
      <el-table-column
        label="更新人"
        prop="editor.phone"
        sortable="custom"
        show-overflow-tooltip
        width="150"
      >
        <template v-slot:default="{ row }: MysteryBoxOrderScope">
          {{ row.editor?.nickname || '-' }}({{ row.editor?.phone || '-' }})
        </template>
      </el-table-column>
      <el-table-column label="操作" fixed="right">
        <template v-slot:default="{ row }">
          <div>
            <el-button
              class="edit-btn"
              link
              size="small"
              type="primary"
              @click="handleClose(row)"
              v-if="row.status === 'TO_BE_RECEIVED' || row.status === 'TO_BE_DELIVERED'"
            >
              <el-icon>
                <close />
              </el-icon>
            </el-button>
            <el-button
              class="edit-btn"
              link
              size="small"
              type="success"
              v-if="row.status === 'TO_BE_DELIVERED' || row.status == 'TO_BE_RECEIVED'"
              @click="handleDeliver(row)"
            >
              <el-icon>
                <promotion></promotion>
              </el-icon>
            </el-button>
          </div>
        </template>
      </el-table-column>
    </el-table>
    <div class="page">
      <el-pagination
        style="margin-top: 30px"
        :current-page="queryRequest.pageNum"
        :page-size="queryRequest.pageSize"
        :page-sizes="[10, 20, 30, 40, 50]"
        :total="pageData.totalElements"
        background
        small
        layout="prev, pager, next, jumper, total, sizes"
        @current-change="(pageNum: number) => loadTableData({ pageNum })"
        @size-change="(pageSize: number) => loadTableData({ pageSize })"
      />
    </div>
  </div>
</template>

<style lang="scss" scoped>
.button-section {
  margin: 20px 0;
}

.page {
  display: flex;
  justify-content: flex-end;
}

.nested-table {
  margin: 8px 0;
}
</style>
