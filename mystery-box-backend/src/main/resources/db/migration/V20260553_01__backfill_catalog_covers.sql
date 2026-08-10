-- Backfill catalog cover art for boxes/products missing images (commercial display quality).

UPDATE mystery_box
SET cover = ELT(1 + MOD(CRC32(id), 8),
    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1606107557195-0a29b4b4abef?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1614680376573-df3480a0be6c?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1618336753974-fee109498bb1?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1614850710567-1fe077356a47?auto=format&fit=crop&w=800&q=80'
)
WHERE cover IS NULL OR TRIM(cover) = '';

UPDATE product
SET cover = ELT(1 + MOD(CRC32(id), 6),
    'https://images.unsplash.com/photo-1618336753974-fee109498bb1?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1614850710567-1fe077356a47?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1606107557195-0a29b4b4abef?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=600&q=80'
)
WHERE cover IS NULL OR TRIM(cover) = '';
