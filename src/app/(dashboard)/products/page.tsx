import Link from "next/link";



import AddProductForm from "@/features/products/components/add-product-form";

import ArchiveProductButton from "@/features/products/components/archive-product-button";

import EditProductForm from "@/features/products/components/edit-product-form";

import RestockProductButton from "@/features/products/components/restock-product-button";



import { getProducts } from "@/lib/db/product";

import RestoreProductButton from "@/features/products/components/restore-product-button";



type Product = {

  id: string;

  name: string;



  ownerId: string;

  ownerName: string;



  categoryId: string;

  category: string;



  unitId: string;

  unit: string;



  stock: number;

  lowStock: number;



  active: boolean;



  createdAt?: string;

  updatedAt?: string;



  saleUnits: {

    id: string;



    unitId: string;

    unitName: string;



    quantityInBaseUnit: number;

    sellingPrice: number;



    isDefault: boolean;

    active: boolean;



    priceRules?: {

      id?: string;

      quantity: number;

      price: number;

      active: boolean;

    }[];

  }[];

};



type ProductsPageProps = {

  searchParams: Promise<{

    view?: string;

    q?: string;

  }>;

};



export const dynamic =

  "force-dynamic";



async function getProductsForPage(): Promise<

  Product[]

> {

  const products =

    await getProducts();



  return products.map(

    (product) => ({

      id:

        product.id,



      name:

        product.name,



      ownerId:

        product.ownerId,



      ownerName:

        product.owner.name,



      categoryId:

        product.categoryId,



      category:

        product.category.name,



      unitId:

        product.unitId,



      unit:

        product.unit.name,



      stock:

        product.stock,



      lowStock:

        product.lowStock,



      active:

        product.active,



      createdAt:

        product.createdAt?.toString(),



      updatedAt:

        product.updatedAt?.toString(),



      saleUnits:

        product.saleUnits.map(

          (saleUnit) => ({

            id:

              saleUnit.id,



            unitId:

              saleUnit.unitId,



            unitName:

              saleUnit.unit.name,



            quantityInBaseUnit:

              saleUnit.quantityInBaseUnit,



            sellingPrice:

              Number(

                saleUnit.sellingPrice,

              ),



            isDefault:

              saleUnit.isDefault,



            active:

              saleUnit.active,



            priceRules:

              (

                saleUnit.priceRules ??

                []

              ).map(

                (rule) => ({

                  id:

                    rule.id,



                  quantity:

                    rule.quantity,



                  price:

                    Number(

                      rule.price,

                    ),



                  active:

                    rule.active,

                }),

              ),

          }),

        ),

    }),

  );

}



function getStockTextColor(

  stock: number,

  lowStock: number,

) {

  if (stock === 0) {

    return "text-red-600";

  }



  if (stock <= lowStock) {

    return "text-amber-600";

  }



  return "text-emerald-600";

}



function getStockBadge(

  stock: number,

  lowStock: number,

) {

  if (stock === 0) {

    return (

      <span className="rounded-lg bg-red-50 px-2 py-1 text-xs font-semibold text-red-600">

        Out

      </span>

    );

  }



  if (stock <= lowStock) {

    return (

      <span className="rounded-lg bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-600">

        Low

      </span>

    );

  }



  return (

    <span className="rounded-lg bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-600">

      OK

    </span>

  );

}



function ArchivedBadge() {

  return (

    <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">

      Archived

    </span>

  );

}



function getVisibleSaleUnits(

  product: Product,

) {

  const activeUnits =

    product.saleUnits.filter(

      (saleUnit) =>

        saleUnit.active,

    );



  if (activeUnits.length > 0) {

    return activeUnits;

  }



  /*

   * For old archived products we may

   * have only historical/inactive units.

   * Showing them is still useful when

   * reviewing the archive.

   */

  return product.saleUnits;

}



export default async function ProductsPage({

  searchParams,

}: ProductsPageProps) {

  const params =

    await searchParams;



  const currentView =

    params.view === "archived"

      ? "archived"

      : "active";



  const search =

    params.q?.trim() ?? "";



  const normalizedSearch =

    search.toLowerCase();



  const products =

    await getProductsForPage();



  const activeProducts =

    products.filter(

      (product) =>

        product.active,

    );



  const archivedProducts =

    products.filter(

      (product) =>

        !product.active,

    );



  const sourceProducts =

    currentView ===

    "archived"

      ? archivedProducts

      : activeProducts;



  const visibleProducts =

    normalizedSearch

      ? sourceProducts.filter(

          (product) =>

            product.name

              .toLowerCase()

              .includes(

                normalizedSearch,

              ) ||

            product.category

              .toLowerCase()

              .includes(

                normalizedSearch,

              ) ||

            product.ownerName

              .toLowerCase()

              .includes(

                normalizedSearch,

              ),

        )

      : sourceProducts;



  const isArchivedView =

    currentView ===

    "archived";



  return (

    <div className="space-y-5 sm:space-y-6">

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">

        <div className="min-w-0">

          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">

            Products

          </h1>



          <p className="mt-1 text-sm leading-6 text-slate-500 sm:text-base">

            Manage active store

            items and keep old

            products safely in the

            archive without losing

            their history.

          </p>

        </div>



        <div className="w-full sm:w-auto">

          <AddProductForm />

        </div>

      </div>



      <section className="grid gap-3 sm:grid-cols-2">

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">

          <p className="text-sm text-slate-500">

            Active Products

          </p>



          <p className="mt-1 text-2xl font-bold text-slate-900">

            {

              activeProducts.length

            }

          </p>

        </div>



        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">

          <p className="text-sm text-slate-500">

            Archived Products

          </p>



          <p className="mt-1 text-2xl font-bold text-slate-900">

            {

              archivedProducts.length

            }

          </p>

        </div>

      </section>



      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">

        <div className="flex rounded-xl bg-slate-100 p-1">

          <Link

            href="/products?view=active"

            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${

              !isArchivedView

                ? "bg-white text-emerald-700 shadow-sm"

                : "text-slate-600 hover:text-slate-900"

            }`}

          >

            Active Products

            <span className="ml-2 text-xs">

              {

                activeProducts.length

              }

            </span>

          </Link>



          <Link

            href="/products?view=archived"

            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${

              isArchivedView

                ? "bg-white text-slate-900 shadow-sm"

                : "text-slate-600 hover:text-slate-900"

            }`}

          >

            Archived Products

            <span className="ml-2 text-xs">

              {

                archivedProducts.length

              }

            </span>

          </Link>

        </div>



        <form

          method="GET"

          className="flex w-full gap-2 sm:max-w-md"

        >

          <input

            type="hidden"

            name="view"

            value={

              currentView

            }

          />



          <input

            type="search"

            name="q"

            defaultValue={

              search

            }

            placeholder="Search name, category or owner"

            className="min-w-0 flex-1 rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-emerald-500"

          />



          <button

            type="submit"

            className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800"

          >

            Search

          </button>

        </form>

      </div>



      {search ? (

        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">

          <p className="text-slate-500">

            Showing{" "}

            <span className="font-semibold text-slate-700">

              {

                visibleProducts.length

              }

            </span>{" "}

            result

            {visibleProducts.length ===

            1

              ? ""

              : "s"}{" "}

            for{" "}

            <span className="font-semibold text-slate-700">

              &quot;{search}&quot;

            </span>

          </p>



          <Link

            href={`/products?view=${currentView}`}

            className="font-medium text-emerald-700 hover:underline"

          >

            Clear search

          </Link>

        </div>

      ) : null}



      {visibleProducts.length ===

      0 ? (

        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm sm:p-10">

          <p className="font-medium text-slate-700">

            {search

              ? "No matching products found."

              : isArchivedView

                ? "No archived products."

                : "No active products yet."}

          </p>



          <p className="mt-1 text-sm text-slate-400">

            {isArchivedView

              ? "Products that are archived will appear here."

              : "Add a product to start building your active catalogue."}

          </p>

        </div>

      ) : (

        <>

          {/* Mobile */}

          <div className="grid grid-cols-1 gap-4 md:hidden">

            {visibleProducts.map(

              (product) => {

                const saleUnits =

                  getVisibleSaleUnits(

                    product,

                  );



                return (

                  <div

                    key={

                      product.id

                    }

                    className={`rounded-2xl border bg-white p-4 shadow-sm ${

                      isArchivedView

                        ? "border-slate-200 opacity-90"

                        : "border-slate-200"

                    }`}

                  >

                    <div className="flex flex-col gap-3">

                      <div className="flex flex-wrap items-start justify-between gap-2">

                        <h2 className="break-words text-base font-semibold text-slate-900">

                          {

                            product.name

                          }

                        </h2>



                        {isArchivedView ? (

                          <ArchivedBadge />

                        ) : (

                          getStockBadge(

                            product.stock,

                            product.lowStock,

                          )

                        )}

                      </div>



                      <div className="grid grid-cols-1 gap-2 text-sm text-slate-600">

                        <p>

                          <span className="font-medium text-slate-800">

                            Category:

                          </span>{" "}

                          {

                            product.category

                          }

                        </p>



                        <p>

                          <span className="font-medium text-slate-800">

                            Owner:

                          </span>{" "}

                          {

                            product.ownerName

                          }

                        </p>



                        <p>

                          <span className="font-medium text-slate-800">

                            Base Unit:

                          </span>{" "}

                          {

                            product.unit

                          }

                        </p>



                        <p>

                          <span className="font-medium text-slate-800">

                            Stock:

                          </span>{" "}

                          <span

                            className={`font-semibold ${

                              isArchivedView

                                ? "text-slate-600"

                                : getStockTextColor(

                                    product.stock,

                                    product.lowStock,

                                  )

                            }`}

                          >

                            {

                              product.stock

                            }

                          </span>

                        </p>



                        <p>

                          <span className="font-medium text-slate-800">

                            Low Stock

                            Threshold:

                          </span>{" "}

                          {

                            product.lowStock

                          }

                        </p>

                      </div>



                      <div>

                        <p className="mb-2 text-sm font-medium text-slate-800">

                          Selling Units

                        </p>



                        {saleUnits.length ===

                        0 ? (

                          <span className="text-sm text-slate-400">

                            No selling

                            units

                          </span>

                        ) : (

                          <div className="flex flex-wrap gap-2">

                            {saleUnits.map(

                              (

                                saleUnit,

                              ) => (

                                <span

                                  key={

                                    saleUnit.id

                                  }

                                  className={`rounded-full px-2.5 py-1.5 text-xs leading-5 ${

                                    saleUnit.isDefault

                                      ? "bg-emerald-50 font-semibold text-emerald-700"

                                      : "bg-slate-100 text-slate-700"

                                  }`}

                                >

                                  {

                                    saleUnit.unitName

                                  }{" "}

                                  • ₦

                                  {saleUnit.sellingPrice.toLocaleString()}{" "}

                                  •{" "}

                                  {

                                    saleUnit.quantityInBaseUnit

                                  }{" "}

                                  base

                                  {saleUnit.isDefault

                                    ? " • Default"

                                    : ""}

                                </span>

                              ),

                            )}

                          </div>

                        )}

                      </div>



                      {!isArchivedView ? (

                        <div className="flex flex-col gap-2 pt-1">

                          <EditProductForm

                            productId={

                              product.id

                            }

                          />



                          <RestockProductButton

                            productId={

                              product.id

                            }

                            productName={

                              product.name

                            }

                          />



                          <ArchiveProductButton

                            productId={

                              product.id

                            }

                            productName={

                              product.name

                            }

                          />

                        </div>

                      ) : (
                        <div className="flex flex-col gap-2 pt-1">
                          <RestoreProductButton
                            productId={product.id}
                            productName={product.name}
                          />

                          <EditProductForm
                            productId={product.id}
                          />

                          <p className="rounded-xl bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-500">
                            You can review the product configuration while it is archived,
                            or restore it to make it active again.
                          </p>
                        </div>
                      )}

                    </div>

                  </div>

                );

              },

            )}

          </div>



          {/* Desktop */}

          <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm md:block">

            <div className="w-full overflow-x-auto">

              <table className="w-full min-w-[980px] text-sm">

                <thead className="bg-slate-50 text-left text-slate-600">

                  <tr>

                    <th className="px-4 py-3 font-medium">

                      Name

                    </th>



                    <th className="px-4 py-3 font-medium">

                      Category

                    </th>



                    <th className="px-4 py-3 font-medium">

                      Owner

                    </th>



                    <th className="px-4 py-3 font-medium">

                      Base Unit

                    </th>



                    <th className="px-4 py-3 font-medium">

                      Stock

                    </th>



                    <th className="px-4 py-3 font-medium">

                      Selling Units

                    </th>



                    <th className="px-4 py-3 font-medium">

                      Status

                    </th>



                    <th className="px-4 py-3 font-medium">

                      Actions

                    </th>

                  </tr>

                </thead>



                <tbody>

                  {visibleProducts.map(

                    (product) => {

                      const saleUnits =

                        getVisibleSaleUnits(

                          product,

                        );



                      return (

                        <tr

                          key={

                            product.id

                          }

                          className="border-t border-slate-100 align-top"

                        >

                          <td className="px-4 py-3 font-semibold text-slate-900">

                            {

                              product.name

                            }

                          </td>



                          <td className="px-4 py-3 text-slate-600">

                            {

                              product.category

                            }

                          </td>



                          <td className="px-4 py-3 text-slate-600">

                            {

                              product.ownerName

                            }

                          </td>



                          <td className="px-4 py-3 text-slate-600">

                            {

                              product.unit

                            }

                          </td>



                          <td className="px-4 py-3">

                            <span

                              className={`font-semibold ${

                                isArchivedView

                                  ? "text-slate-600"

                                  : getStockTextColor(

                                      product.stock,

                                      product.lowStock,

                                    )

                              }`}

                            >

                              {

                                product.stock

                              }

                            </span>

                          </td>



                          <td className="px-4 py-3 text-slate-600">

                            {saleUnits.length ===

                            0 ? (

                              <span className="text-slate-400">

                                No selling

                                units

                              </span>

                            ) : (

                              <div className="flex flex-wrap gap-2">

                                {saleUnits.map(

                                  (

                                    saleUnit,

                                  ) => (

                                    <span

                                      key={

                                        saleUnit.id

                                      }

                                      className={`rounded-full px-2 py-1 text-xs ${

                                        saleUnit.isDefault

                                          ? "bg-emerald-50 font-semibold text-emerald-700"

                                          : "bg-slate-100 text-slate-700"

                                      }`}

                                    >

                                      {

                                        saleUnit.unitName

                                      }{" "}

                                      • ₦

                                      {saleUnit.sellingPrice.toLocaleString()}

                                      {" • "}

                                      {

                                        saleUnit.quantityInBaseUnit

                                      }{" "}

                                      base

                                      {saleUnit.isDefault

                                        ? " • Default"

                                        : ""}

                                    </span>

                                  ),

                                )}

                              </div>

                            )}

                          </td>



                          <td className="px-4 py-3">

                            {isArchivedView ? (

                              <ArchivedBadge />

                            ) : (

                              getStockBadge(

                                product.stock,

                                product.lowStock,

                              )

                            )}

                          </td>



                          <td className="px-4 py-3">

                            {!isArchivedView ? (

                              <div className="flex flex-col gap-2">

                                <EditProductForm

                                  productId={

                                    product.id

                                  }

                                />



                                <RestockProductButton

                                  productId={

                                    product.id

                                  }

                                  productName={

                                    product.name

                                  }

                                />



                                <ArchiveProductButton

                                  productId={

                                    product.id

                                  }

                                  productName={

                                    product.name

                                  }

                                />

                              </div>

                            ) : (
                              <div className="flex flex-col gap-2">
                                <RestoreProductButton
                                  productId={product.id}
                                  productName={product.name}
                                />

                                <EditProductForm
                                  productId={product.id}
                                />
                              </div>
                            )}

                          </td>

                        </tr>

                      );

                    },

                  )}

                </tbody>

              </table>

            </div>

          </div>

        </>

      )}

    </div>

  );

}