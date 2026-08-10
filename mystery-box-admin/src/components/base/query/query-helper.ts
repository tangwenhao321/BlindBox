import { type Ref, ref } from 'vue'

export const useQueryHelper = <T>(initQuery: T) => {
  const query = ref({ ...initQuery }) as Ref<T>
  const resetQuery = () => {
    query.value = { ...initQuery }
  }
  // Keep backward compatibility for legacy callers.
  const restQuery = resetQuery
  return { query, resetQuery, restQuery }
}
