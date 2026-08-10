<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import ListPageShell from '@/components/base/layout/list-page-shell.vue'
import request from '@/utils/request'

type ReleaseRow = {
  id: string
  platform: string
  channel: string
  versionCode: number
  versionName: string
  downloadUrl: string
  forceUpdate: boolean
  minSupportedVersionCode: number
  releaseNotes: string
  pushTitle: string
  pushBody: string
  autoPush: boolean
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
  publishedTime?: string
  lastPushedTime?: string
  pushSentCount: number
  operator: string
  editedTime?: string
}

type PushLogRow = {
  id: string
  triggerSource: string
  operator: string
  targetCount: number
  createdTime: string
}

const emptyForm = () => ({
  id: '',
  platform: 'android',
  channel: 'production',
  versionCode: 0,
  versionName: '',
  downloadUrl: '',
  forceUpdate: false,
  minSupportedVersionCode: 0,
  releaseNotes: '',
  pushTitle: '',
  pushBody: '',
  autoPush: true
})

const rows = ref<ReleaseRow[]>([])
const pushLogs = ref<PushLogRow[]>([])
const loading = ref(false)
const saving = ref(false)
const dialogVisible = ref(false)
const form = reactive(emptyForm())

const isEditing = computed(() => !!form.id)

const statusLabel: Record<string, string> = {
  DRAFT: '草稿',
  PUBLISHED: '已发布',
  ARCHIVED: '已归档'
}

const statusTagType = (status: string) =>
  status === 'PUBLISHED' ? 'success' : status === 'ARCHIVED' ? 'info' : 'warning'

const load = async () => {
  loading.value = true
  try {
    rows.value = ((await request({ url: '/admin/app-version', method: 'get' })) as ReleaseRow[]) || []
  } catch (e: unknown) {
    ElMessage.error(e instanceof Error ? e.message : '加载失败')
  } finally {
    loading.value = false
  }
}

const openCreate = () => {
  Object.assign(form, emptyForm())
  dialogVisible.value = true
}

const openEdit = (row: ReleaseRow) => {
  Object.assign(form, {
    id: row.id,
    platform: row.platform,
    channel: row.channel,
    versionCode: row.versionCode,
    versionName: row.versionName,
    downloadUrl: row.downloadUrl,
    forceUpdate: row.forceUpdate,
    minSupportedVersionCode: row.minSupportedVersionCode,
    releaseNotes: row.releaseNotes,
    pushTitle: row.pushTitle,
    pushBody: row.pushBody,
    autoPush: row.autoPush
  })
  dialogVisible.value = true
}

const save = async () => {
  if (!form.versionCode || form.versionCode <= 0) {
    ElMessage.warning('请填写大于 0 的 versionCode')
    return
  }
  if (!form.downloadUrl.trim()) {
    ElMessage.warning('请填写安装包下载地址')
    return
  }
  saving.value = true
  const payload = {
    platform: form.platform,
    channel: form.channel,
    versionCode: form.versionCode,
    versionName: form.versionName,
    downloadUrl: form.downloadUrl,
    forceUpdate: form.forceUpdate,
    minSupportedVersionCode: form.minSupportedVersionCode,
    releaseNotes: form.releaseNotes,
    pushTitle: form.pushTitle,
    pushBody: form.pushBody,
    autoPush: form.autoPush
  }
  try {
    if (isEditing.value) {
      await request({ url: `/admin/app-version/${form.id}`, method: 'put', data: payload })
    } else {
      await request({ url: '/admin/app-version', method: 'post', data: payload })
    }
    ElMessage.success('已保存')
    dialogVisible.value = false
    await load()
  } catch (e: unknown) {
    ElMessage.error(e instanceof Error ? e.message : '保存失败')
  } finally {
    saving.value = false
  }
}

const publish = async (row: ReleaseRow) => {
  const pushNote = row.autoPush
    ? '发布后将立即向所有已注册设备推送更新通知。'
    : '该版本已关闭自动推送，发布后不会主动通知用户。'
  try {
    await ElMessageBox.confirm(
      `确认发布 ${row.platform} ${row.versionName || row.versionCode}（${row.channel}）？${pushNote}`,
      '发布确认',
      { type: 'warning' }
    )
  } catch {
    return
  }
  try {
    await request({ url: `/admin/app-version/${row.id}/publish`, method: 'post' })
    ElMessage.success('已发布')
    await load()
  } catch (e: unknown) {
    ElMessage.error(e instanceof Error ? e.message : '发布失败')
  }
}

const rePush = async (row: ReleaseRow) => {
  try {
    await ElMessageBox.confirm('确认再次向所有设备推送该版本的更新通知？', '推送确认', {
      type: 'warning'
    })
  } catch {
    return
  }
  try {
    const count = (await request({
      url: `/admin/app-version/${row.id}/push`,
      method: 'post'
    })) as number
    ElMessage.success(`已推送 ${count ?? 0} 台设备`)
    await load()
  } catch (e: unknown) {
    ElMessage.error(e instanceof Error ? e.message : '推送失败')
  }
}

const archive = async (row: ReleaseRow) => {
  try {
    await request({ url: `/admin/app-version/${row.id}/archive`, method: 'post' })
    ElMessage.success('已归档')
    await load()
  } catch (e: unknown) {
    ElMessage.error(e instanceof Error ? e.message : '归档失败')
  }
}

const remove = async (row: ReleaseRow) => {
  try {
    await ElMessageBox.confirm('确认删除该版本记录？', '删除确认', { type: 'warning' })
  } catch {
    return
  }
  try {
    await request({ url: `/admin/app-version/${row.id}`, method: 'delete' })
    ElMessage.success('已删除')
    await load()
  } catch (e: unknown) {
    ElMessage.error(e instanceof Error ? e.message : '删除失败')
  }
}

const loadPushLogs = async (row: ReleaseRow) => {
  try {
    pushLogs.value =
      ((await request({
        url: `/admin/app-version/${row.id}/push-log`,
        method: 'get'
      })) as PushLogRow[]) || []
  } catch (e: unknown) {
    ElMessage.error(e instanceof Error ? e.message : '加载推送记录失败')
  }
}

onMounted(() => void load())
</script>

<template>
  <list-page-shell>
    <template #query>
      <p class="hint">
        App 版本发布：发布后 <code>/front/app/update-check</code> 立即下发新版本，并按需向所有已注册设备推送
        APP_UPDATE 通知（客户端收到后会自动弹出更新框）。低于「最低支持版本」的客户端将被强制更新。
      </p>
      <el-space>
        <el-button type="primary" :loading="loading" @click="load">刷新</el-button>
        <el-button type="success" @click="openCreate">新建版本</el-button>
      </el-space>
    </template>

    <el-table v-loading="loading" :data="rows" border stripe @row-click="loadPushLogs">
      <el-table-column prop="platform" label="平台" width="90" />
      <el-table-column prop="channel" label="渠道" width="120" />
      <el-table-column prop="versionCode" label="versionCode" width="120" />
      <el-table-column prop="versionName" label="版本名" width="110" />
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="statusTagType(row.status)">{{ statusLabel[row.status] ?? row.status }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="强制" width="90">
        <template #default="{ row }">
          <el-tag v-if="row.forceUpdate" type="danger">强制</el-tag>
          <span v-else-if="row.minSupportedVersionCode > 0">&lt; {{ row.minSupportedVersionCode }}</span>
          <span v-else>—</span>
        </template>
      </el-table-column>
      <el-table-column label="自动推送" width="100">
        <template #default="{ row }">
          <el-tag :type="row.autoPush ? 'success' : 'info'">{{ row.autoPush ? '开' : '关' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="pushSentCount" label="已推送" width="90" />
      <el-table-column prop="lastPushedTime" label="最近推送" width="170" />
      <el-table-column label="操作" width="300" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click.stop="openEdit(row)">编辑</el-button>
          <el-button
            v-if="row.status !== 'PUBLISHED'"
            link
            type="success"
            @click.stop="publish(row)"
            >发布</el-button
          >
          <el-button
            v-if="row.status === 'PUBLISHED'"
            link
            type="warning"
            @click.stop="rePush(row)"
            >重新推送</el-button
          >
          <el-button
            v-if="row.status === 'PUBLISHED'"
            link
            type="info"
            @click.stop="archive(row)"
            >归档</el-button
          >
          <el-button
            v-if="row.status !== 'PUBLISHED'"
            link
            type="danger"
            @click.stop="remove(row)"
            >删除</el-button
          >
        </template>
      </el-table-column>
    </el-table>

    <div v-if="pushLogs.length" class="push-logs">
      <h4>推送记录</h4>
      <el-table :data="pushLogs" border size="small">
        <el-table-column prop="createdTime" label="时间" width="180" />
        <el-table-column prop="triggerSource" label="触发来源" width="120" />
        <el-table-column prop="operator" label="操作人" width="200" />
        <el-table-column prop="targetCount" label="设备数" width="100" />
      </el-table>
    </div>

    <el-dialog
      v-model="dialogVisible"
      :title="isEditing ? '编辑版本' : '新建版本'"
      width="640px"
    >
      <el-form label-width="140px">
        <el-form-item label="平台">
          <el-select v-model="form.platform" style="width: 200px">
            <el-option label="android" value="android" />
            <el-option label="ios" value="ios" />
          </el-select>
        </el-form-item>
        <el-form-item label="渠道">
          <el-input v-model="form.channel" placeholder="production / production-vn / test" />
        </el-form-item>
        <el-form-item label="versionCode">
          <el-input-number v-model="form.versionCode" :min="1" :max="999999" />
        </el-form-item>
        <el-form-item label="版本名">
          <el-input v-model="form.versionName" placeholder="1.0.6" />
        </el-form-item>
        <el-form-item label="下载地址">
          <el-input v-model="form.downloadUrl" placeholder="https://.../app-release.apk" />
        </el-form-item>
        <el-form-item label="强制更新">
          <el-switch v-model="form.forceUpdate" />
        </el-form-item>
        <el-form-item label="最低支持版本">
          <el-input-number v-model="form.minSupportedVersionCode" :min="0" :max="999999" />
          <span class="tip">低于该 versionCode 的客户端会被强制更新，0 表示不限制</span>
        </el-form-item>
        <el-form-item label="更新内容">
          <el-input v-model="form.releaseNotes" type="textarea" :rows="3" />
        </el-form-item>
        <el-form-item label="发布即推送">
          <el-switch v-model="form.autoPush" />
        </el-form-item>
        <el-form-item label="推送标题">
          <el-input v-model="form.pushTitle" placeholder="留空则自动生成" />
        </el-form-item>
        <el-form-item label="推送正文">
          <el-input v-model="form.pushBody" type="textarea" :rows="2" placeholder="留空则使用更新内容" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="save">保存</el-button>
      </template>
    </el-dialog>
  </list-page-shell>
</template>

<style scoped>
.hint {
  margin: 0 0 12px;
  color: #64748b;
  font-size: 13px;
  line-height: 1.6;
}
.push-logs {
  margin-top: 24px;
}
.push-logs h4 {
  margin: 0 0 12px;
  color: #334155;
}
.tip {
  margin-left: 12px;
  color: #94a3b8;
  font-size: 12px;
}
</style>
