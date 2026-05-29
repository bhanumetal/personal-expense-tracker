import { getCategories } from '@/lib/data/categories'
import { CategoriesClient } from './_components/CategoriesClient'

export default async function CategoriesPage() {
  const categories = await getCategories()

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Categories</h1>
        <p className="text-default-500 text-sm">
          {categories.length} {categories.length === 1 ? 'category' : 'categories'}
        </p>
      </div>
      <CategoriesClient categories={categories} />
    </div>
  )
}
