<script lang="tsx">
import { computed, defineComponent, ref } from 'vue'
import { ElIcon, ElMessage, ElUpload, type UploadProps } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import request from '@/utils/request'
import { resolveMediaUrl } from '@/utils/media-url'
import { extractApiErrorMessage } from '@/utils/api-error'
import { compressImageFile } from '@/utils/compress-image'

const ALLOWED_TYPES = new Set(['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/pjpeg'])
const ALLOWED_EXT = /\.(png|jpe?g|webp)$/i

export default defineComponent({
  props: {
    modelValue: { type: String, default: '' },
    size: { type: Number, default: 120 }
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    const loading = ref(false)
    const uploadHeaders = computed(() => {
      const token = localStorage.getItem('token')
      return token ? { token } : {}
    })

    const beforeImageUpload: UploadProps['beforeUpload'] = (rawFile) => {
      const typeOk = ALLOWED_TYPES.has(rawFile.type)
      const extOk = ALLOWED_EXT.test(rawFile.name)
      if (!typeOk && !extOk) {
        ElMessage.error('仅支持 PNG / JPG / WEBP 图片')
        return false
      }
      if (rawFile.size / 1024 / 1024 > 2) {
        ElMessage.error('图片大小不能超过 2MB')
        return false
      }
      return true
    }

    const httpRequest: UploadProps['httpRequest'] = async (options) => {
      const file = await compressImageFile(options.file as File)
      const formData = new FormData()
      formData.append('file', file)
      loading.value = true
      try {
        const url = (await request({
          url: '/oss/upload',
          method: 'post',
          data: formData
        })) as string
        if (!url) {
          throw new Error('empty url')
        }
        emit('update:modelValue', url)
        options.onSuccess?.(url)
      } catch (err) {
        ElMessage.error(extractApiErrorMessage(err, '图片上传失败，请重新登录或检查 OSS 配置'))
        options.onError?.(new Error(extractApiErrorMessage(err, 'upload failed')) as never)
      } finally {
        loading.value = false
      }
    }

    const boxStyle = {
      width: `${props.size}px`,
      height: `${props.size}px`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }

    return () => (
      <div class="image-uploader" v-loading={loading.value}>
        <ElUpload
          beforeUpload={beforeImageUpload}
          httpRequest={httpRequest}
          headers={uploadHeaders.value}
          showFileList={false}
          accept="image/png,image/jpeg,image/jpg,image/webp"
          class="image-uploader-trigger"
        >
          {props.modelValue ? (
            <img
              alt="图片"
              src={resolveMediaUrl(props.modelValue)}
              class="image-uploader-preview"
              style={{
                ...boxStyle,
                objectFit: 'cover'
              }}
            />
          ) : (
            <div class="image-uploader-placeholder" style={boxStyle}>
              <ElIcon size={Math.min(props.size * 0.35, 28)} class="image-uploader-icon">
                <Plus />
              </ElIcon>
            </div>
          )}
        </ElUpload>
      </div>
    )
  }
})
</script>

<style scoped>
.image-uploader {
  display: inline-block;
  line-height: 0;
}

.image-uploader :deep(.image-uploader-trigger) {
  display: inline-block;
}

.image-uploader :deep(.el-upload) {
  border: 1px dashed var(--el-border-color);
  border-radius: 6px;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition: var(--el-transition-duration-fast);
  line-height: 0;
}

.image-uploader :deep(.el-upload:hover) {
  border-color: var(--el-color-primary);
}

/* 隐藏原生「选择文件」控件，仅保留点击图片区域上传 */
.image-uploader :deep(.el-upload__input) {
  display: none !important;
}

.image-uploader :deep(.el-upload-list) {
  display: none !important;
  margin: 0 !important;
}

.image-uploader-preview,
.image-uploader-placeholder {
  vertical-align: top;
}

.image-uploader-icon {
  color: #8c939d;
}
</style>
