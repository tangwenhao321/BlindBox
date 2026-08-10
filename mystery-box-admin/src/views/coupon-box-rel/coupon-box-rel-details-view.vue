<script setup lang="ts">
import { onActivated, reactive, ref } from 'vue'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import type { CouponBoxRelInput } from '@/apis/__generated/model/static'
import RemoteSelect from '@/components/base/form/remote-select.vue'
import { assertFormValidate } from '@/utils/common'
import { api } from '@/utils/api-instance'
import { useFormHelper } from '@/components/base/form/form-helper'
import { couponQueryOptions } from '@/views/coupon/coupon'
import { mysteryBoxQueryOptions } from '@/views/mystery-box/mystery-box'

const props = defineProps<{ id?: string }>()
const formRef = ref<FormInstance>()
const initForm: CouponBoxRelInput = {
  couponId: '',
  boxId: ''
}
const { formData: form, restForm } = useFormHelper<CouponBoxRelInput>(initForm)
const rules = reactive<FormRules<CouponBoxRelInput>>({
  couponId: [{ required: true, message: '请选择优惠券', trigger: 'blur' }],
  boxId: [{ required: true, message: '请选择盲盒', trigger: 'blur' }]
})
const handleConfirm = () => {
  formRef.value?.validate(
    assertFormValidate(() =>
      api.couponBoxRelForAdminController.save({ body: form.value }).then(async (res) => {
        form.value.id = res
        ElMessage.success('操作成功')
      })
    )
  )
}
onActivated(() => {
  if (props.id) {
    api.couponBoxRelForAdminController.findById({ id: props.id }).then((res) => {
      form.value = { ...res, couponId: res.coupon.id, boxId: res.box.id }
    })
  } else {
    restForm()
  }
})
</script>

<template>
  <div class="form">
    <el-form labelWidth="120" class="form" ref="formRef" :model="form" :rules="rules">
      <el-form-item label="优惠券" prop="couponId">
        <remote-select
          label-prop="name"
          :query-options="couponQueryOptions"
          v-model="form.couponId"
        ></remote-select>
      </el-form-item>
      <el-form-item label="盲盒" prop="boxId">
        <remote-select
          label-prop="name"
          :query-options="mysteryBoxQueryOptions"
          v-model="form.boxId"
        ></remote-select>
      </el-form-item>
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
</style>
