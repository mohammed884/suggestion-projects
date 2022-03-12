//DOM

//CONTAINERS
const productsContainer = document.querySelector("#products-container");
const categoriesFilterContainer = document.querySelector("#categories-filter-container");
const categoriesFetchFilterContainer = document.querySelector("#categories-fetch-filter-container");
const categoriesSuggestionContainer = document.querySelector("#categories-suggestion-container")

//LISTS
let products = JSON.parse(localStorage.getItem("products_data")) || [];
let filterdProducts = [];
const categoriesFilterList = [];
const categoriesTitles = [];
//INPUTS
const limtInput = document.querySelector("#limt-input");
const categoriesFilterInput = document.querySelector("#category-filter-input")
const categoryFetchFilterName = document.querySelector("#fetch-filter-name");
const categoryFetchFilterAmount = document.querySelector("#fetch-filter-amount");
const totalProducts = document.querySelector("#total-products");
//FILTERING
const sort = document.querySelector("#sort");
const categoryAmout = document.querySelector("#category-amout");
const fetchCategoryBtn = document.querySelector("#fetch-category-btn");

//HTML ELEMENTS
let total = 0;
const productTemplate = document.querySelector("#product-template");
const categoryTemplate = document.querySelector("#category-template");
const fetchCategoryTemplate = document.querySelector("#fetch-category-template");
const randomFetchBtn = document.querySelector("#random-fetch-btn")
const fetchWithFiltersBtn = document.querySelector("#fetch-with-filters-btn");
const loadingBar = document.querySelector("#loading-bar");
const controlPanel = document.querySelector("#control-panel")
const openControlPanel = document.querySelector("#open-control-panel")
const closeControlPanel = document.querySelector("#close-control-panel");
//LOCAL STORAGE VARIABLES
let productsSlugs = JSON.parse(localStorage.getItem("products_slugs")) || [];
const postedProducts = JSON.parse(localStorage.getItem("posted_products")) || [];
const productsData = JSON.parse(localStorage.getItem("products_data")) || [];
const categoriesList = JSON.parse(localStorage.getItem("categories_list")) || [];
const categoriesFetchFilterList = JSON.parse(localStorage.getItem("fetch_categories_filter")) || [];
const nextSlugsFetchDate = JSON.parse(localStorage.getItem("next_slugs_fetch_date")) || '';
const nextDataFetchDate = JSON.parse(localStorage.getItem("next_data_fetch_date")) || '';
const limt = Number(JSON.parse(localStorage.getItem("limt"))) || 80;


//SHUFFLE PRODUCTS
const shuffle = (arr) => {
    for (let i = 0; i < arr.length; i++) {
        const random = Math.floor(Math.random() * i)
        const temp = arr[i];
        arr[i] = arr[random];
        arr[random] = temp;
    }
    return arr.map(product => (product.slug));
}
const callApi = async url => {
    let res = await fetch(url, { method: "GET" });
    res = await res.json();
    return res.data;
};

//RENDER DATA
const render = async () => {
    const today = dayjs().format("M/D/YYYY");
    const nextFetch = dayjs(nextSlugsFetchDate);
    const checkDate = nextFetch.diff(today, "d")
    limtInput.placeholder = `Default limt Next Time ${limt}`;

    //DISABLE CATEGORIES FILTER INPUT
    categoriesFilterInput.disabled = true
    sort.disabled = true
    categoriesFilterInput.style.cursor = "not-allowed"
    sort.style.cursor = "not-allowed"
    //CHECK LOCALSTORAGE INFORMATION DATE
    if (!nextSlugsFetchDate || productsSlugs.length < 1 || checkDate < 1) {
        //CREATE CATEGORIES FILTERS
        for (let i = 0; i < categoriesFetchFilterList.length; i++) {
            const { name, amount } = categoriesFetchFilterList[i];
            createCategoryFetchFilter(name, amount)
        }
        //FETCH AND STORE CATEGORIES 
        await fetchAndStoreCategories()

        //FETCH AND STORE PRODUCTS SLUGS
        const storedTitles = await fetchAndStoreProductsTitles();

        //RENDER DATA IN THE DOM
        await fetchProductsData(storedTitles);
    } else {
        //CREATE CATEGORIES FILTERS
        for (let i = 0; i < categoriesFetchFilterList.length; i++) {
            const { name, amount } = categoriesFetchFilterList[i];
            createCategoryFetchFilter(name, amount)
        }
        for (let i = 0; i < categoriesList.length; i++) createCategoryOption(categoriesList[i])

        await fetchProductsData()
        totalProducts.textContent = `Total (${total} / ${limt})`
    }
    //ENABLE CATEGORIES FILTER INPUT
    categoriesFilterInput.disabled = false
    sort.disabled = false
    categoriesFilterInput.style.cursor = "auto"
    sort.style.cursor = "auto"
    loadingBar.style.display = "none"
};

//FETCH PRODUCTS TITLES  
const fetchAndStoreProductsTitles = async () => {
    //FETCH PRODUCTS DATA
    const shuffled = shuffle(await callApi("https://api.ardunic.com/v1/products?s=20000"))

    //STORE ALL PRODUCTS SLUGS
    localStorage.setItem("products_slugs", JSON.stringify(shuffled));

    //STORE THE NEXT FETCH DATE
    localStorage.setItem("next_slugs_fetch_date", JSON.stringify(dayjs().add(7, 'days').format("M/D/YYYY")));

    return shuffled
}

//FETCH PRODUCTS DATA  
const fetchProductsData = async passedData => {
    const data = passedData || productsSlugs;

    //LOOP OVER PRODUCTS
    const today = dayjs().format("M/D/YYYY")
    const nextFetch = dayjs(nextDataFetchDate);
    const checkDate = nextFetch.diff(today, "d")

    if (!nextDataFetchDate || nextDataFetchDate === NaN || products.length < 1 || checkDate < 1) {
        await fetchAndStoreProductsData(data)
        localStorage.setItem("next_data_fetch_date", JSON.stringify(dayjs().add(1, 'days').format("M/D/YYYY")));
    }
    else if (products.length > 0) {
        total = 0;
        for (let i = 0; i < products.length; i++) {
            const { title } = products[i];
            const check = postedProducts.some(p => p === title);
            if (!check) {
                createProductCard(products[i])
                total++;
                totalProducts.textContent = `Total (${total} / ${products.length})`
            }
        }
    }
};

//FETCH ALL CATEGORIES
const fetchAndStoreCategories = async () => {
    const data = await callApi("https://api.ardunic.com/v1/sections");
    const categories = []
    for (let i = 0; i < data.length; i++) {
        const { name, } = data[i];
        createCategoryOption(name);
        categories.push(name)
    }
    localStorage.setItem("categories_list", JSON.stringify(categories))
}
//FETCH PRODUCTS DATA ONCE A DAY AND STORE IT IN LOCALSTORAGE
const fetchAndStoreProductsData = async (data) => {
    total = 0;
    const totalFilterAmount = categoriesFetchFilterList.reduce((prev, current) => prev + Number(current.amount), 0);
    for (let i = 0; i < data.length; i++) {
        if (categoriesFetchFilterList.length > 0 && products.length >= totalFilterAmount) break
        else if (products.length >= limt) break;

        //FETCH SINGLE PRODUCT DATA EVER LOOP
        const { title, images, stock, categories, types, price, slug } = await callApi(`https://api.ardunic.com/v1/product/${data[i]}`);

        //CHECK IF THE PRODUCT IS EMPTY
        if (stock > 1 || types.length > 1) {
            //CHECK IF THE ELEMENT IS POSTED
            const check = postedProducts.length > 0 ? postedProducts.some(p => p === title) : false;

            if (!check) {
                const currentProductCategories = categories.map(c => (c.sections)).flat(1);
                if (categoriesFetchFilterList.length > 0) {
                    categoriesFetchFilterList.forEach(filter => {
                        const { name, amount } = filter;
                        let isEnoughAmount = 0;

                        //CHECK IF THE FILTERED PRODUCTS HAS ENOUGH
                        products.forEach(p => {
                            const currentProductCategories = p.categories;
                            const check = currentProductCategories.some(c => c.name === name);
                            if (check) isEnoughAmount++;
                        });
                        if (isEnoughAmount >= amount) return;

                        const checkCategory = currentProductCategories.some(c => c.name === name);
                        if (checkCategory) {
                            products.push({ title, images, stock, categories: categories.map(c => (c.sections)).flat(1), price: price.showPrice, types, slug })
                            createProductCard({ title, images, stock, categories, price: price.showPrice, slug });
                            total += 1
                            totalProducts.textContent = `Total (${total} / ${limt})`
                        }
                    });
                }
                else {
                    products.push({ slug, title, images, stock, categories: categories.map(c => (c.sections)).flat(1), price: price.showPrice });
                    createProductCard({ title, images, stock, categories, price: price.showPrice, slug });
                    total += 1
                    totalProducts.textContent = `Total (${total} / ${limt})`
                }
            }
        }
    };
    if (categoriesFetchFilterList.length > 0 && totalFilterAmount < limt) {
        for (let i = 0; i < data.length; i++) {
            if (products.length >= (limt + totalFilterAmount)) break;
            const { title, slug, images, stock, categories, types, price } = await callApi(`https://api.ardunic.com/v1/product/${data[i]}`);
            if (stock > 1 || types.length > 1) {
                const isPosted = postedProducts.some(p => p === title);
                if (!isPosted) {
                    products.push({ slug, title, images, stock, categories: categories.map(c => (c.sections)).flat(1), price: price.showPrice, types })
                    createProductCard({ title, images, stock, categories, price: price.showPrice, slug });
                    total += 1;
                    totalProducts.textContent = `Total (${total} / ${limt})`
                }
            }
        }
    }
    window.location.reload(true);
    localStorage.setItem("products_data", JSON.stringify(products));
}
//CREATE DOM ELEMENTS
const createProductCard = ({ title, images, stock, price, slug }) => {
    const clone = productTemplate.cloneNode(true);
    clone.style.display = 'flex';
    clone.id = slug
    const { children } = clone;
    children[0].src = `https://ardunic-images.s3.eu-central-1.amazonaws.com/${images[0]}`
    children[1].textContent = title;
    children[2].children[0].textContent = `Price ${new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'IQD' }).format(price)}`;
    children[2].children[2].textContent = stock < 1 ? `Product Contains Types` : `Stock ${stock}`;

    //ADD POSTED FUNCTION
    children[2].children[4].onclick = e => {
        const confirmation = window.confirm('Are you sure?');
        if (confirmation) {
            const element = e.target;
            const parent = element.parentElement.parentElement;
            postedProducts.push(title);
            localStorage.setItem("posted_products", JSON.stringify(postedProducts));
            productsContainer.removeChild(parent)
            total -= 1;
            totalProducts.textContent = `Total (${total} / ${products.length})`
        }
    };
    productsContainer.appendChild(clone)
}

//CREATE OPTIONS FOR SEARCH INPUT DATALIST
const createCategoryOption = categoryName => {
    const option = document.createElement("option");
    option.value = categoryName;
    option.textContent = categoryName;
    categoriesSuggestionContainer.appendChild(option)
};

//CREATE CATEGORY FILTER CARD
const createCategoryFilter = categoryName => {
    const clone = categoryTemplate.cloneNode(true);
    clone.style.display = "flex";
    const { children } = clone
    clone.id = categoryName;
    children[0].textContent = categoryName;
    children[1].onclick = deleteFilterCategory;
    //APPEND THE CLONE
    total = 0;
    categoriesFilterContainer.appendChild(clone);
    for (let i = 0; i < products.length; i++) {
        const { categories, title } = products[i];
        for (let x = 0; x < categories.length; x++) {
            const category = categories[x];
            if (categoriesFilterList.some(c => c === category.name)) {
                if (!filterdProducts.some(p => p.title === title) && !postedProducts.some(p => p === title)) {
                    filterdProducts.push(products[i])
                    createProductCard(products[i])
                }
            }
        }
    };
    removeProductsContainerChildren();
    for (let x = 0; x < filterdProducts.length; x++) {
        createProductCard(filterdProducts[x])
        total += 1
    }
    totalProducts.textContent = `Total (${total} / ${limt})`


}

//CREATE CATEGORY FETCH FILTER CARD 
const createCategoryFetchFilter = (name, amount) => {
    const clone = fetchCategoryTemplate.cloneNode(true);
    clone.style.display = "flex";
    clone.id = name;
    const { children } = clone;
    children[0].textContent = name;
    children[1].textContent = amount;
    children[2].onclick = e => {
        const element = e.target;
        const parent = element.closest("button").parentElement;
        const index = categoriesFetchFilterList.findIndex(c => c.name === name);
        categoriesFetchFilterList.splice(index, 1);
        localStorage.setItem("fetch_categories_filter", JSON.stringify(categoriesFetchFilterList));
        categoriesFetchFilterContainer.removeChild(parent);
    }
    categoriesFetchFilterContainer.appendChild(clone)

}
//REMOVE DOM ELEMENTS 
const deleteFilterCategory = e => {
    const element = e.target.closest("div");
    const parent = element.closest("#categories-filter-container");
    const index = categoriesFilterList.findIndex(c => c === element.id);

    //REMOVE CATEGORY FROM THE LIST
    categoriesFilterList.splice(index, 1);
    if (categoriesFilterList.length < 1) categoriesFilterContainer.removeChild(categoriesFilterContainer.children[0])
    filterdProducts = [];
    removeProductsContainerChildren();
    if (categoriesFilterList.length < 1) {
        for (let x = 0; x < products.length; x++) {
            createProductCard(products[x]);
        }
        const span = document.createElement("span");
        span.classList.add("font-bold")
        span.classList.add("text-slate-200");
        span.textContent = "Categories Filter is Empty"
        categoriesFilterContainer.appendChild(span)
        totalProducts.textContent = `Total (${products.length} / ${limt})`

    } else {
        total = 0;
        for (let i = 0; i < products.length; i++) {
            const { categories, title } = products[i];
            for (let x = 0; x < categories.length; x++) {
                const category = categories[x];
                if (categoriesFilterList.some(c => c === category.name)) {
                    if (!filterdProducts.some(p => p.title === title) && !postedProducts.some(p => p === title)) {
                        total += 1
                        filterdProducts.push(products[i])
                        createProductCard(products[i])
                    }
                }
            }
        };
        totalProducts.textContent = `Total (${total} / ${limt})`
    }
    parent.removeChild(element);
}
const removeProductsContainerChildren = () => {
    while (productsContainer.firstChild) {
        productsContainer.removeChild(productsContainer.firstChild);
    }
}

//APPLY EVENTS ON DOM
openControlPanel.onclick = () => {
    controlPanel.classList.add("right-0");
    controlPanel.classList.remove("sm:right-[-3000px]");

    openControlPanel.style.display = "none"
    closeControlPanel.style.display = "block"
}
closeControlPanel.onclick = () => {
    controlPanel.classList.add("sm:right-[-3000px]");
    controlPanel.classList.remove("right-0");

    openControlPanel.style.display = "block"
    closeControlPanel.style.display = "none"
}
randomFetchBtn.onclick = async () => {
    localStorage.removeItem("next_slugs_fetch_date")
    localStorage.removeItem("next_data_fetch_date")
    localStorage.removeItem("products_slugs")
    localStorage.removeItem("products_data")
    //FETCH AND STORE PRODUCTS 
    window.location.reload(true)
}
fetchWithFiltersBtn.onclick = async () => {
    localStorage.removeItem("products_data")
    localStorage.removeItem("next_data_fetch_date")
    window.location.reload(true)
}
limtInput.onkeyup = e => {
    localStorage.setItem("limt", JSON.stringify(e.target.value));
    setTimeout(() => e.target.value = "", 2000)
}
fetchCategoryBtn.onclick = () => {
    const name = categoryFetchFilterName.value;
    const amount = categoryFetchFilterAmount.value;
    const index = categoriesFetchFilterList.findIndex(c => c.name === name);
    const checkCategory = categoriesList.some(c => c === name);
    if (!checkCategory || amount === " " || amount === "" || amount < 1 || name === "" || name === " ") {
        categoryFetchFilterName.value = ""
        categoryFetchFilterName.value = ""
        return
    }
    else if (index > -1) {
        categoriesFetchFilterList[index].amount = amount;
        localStorage.setItem("fetch_categories_filter", JSON.stringify(categoriesFetchFilterList));
        document.getElementById(name).children[1].textContent = amount
        return;
    }
    categoriesFetchFilterList.push({ name, amount });
    localStorage.setItem("fetch_categories_filter", JSON.stringify(categoriesFetchFilterList));
    createCategoryFetchFilter(name, amount);
    categoryFetchFilterName.value = ""
    categoryFetchFilterName.value = ""
}
categoriesFilterInput.onchange = e => {
    const value = e.target.value;
    const checkCategory = categoriesList.some(c => c === value);
    const checkDub = categoriesFilterList.some(category => category === value)

    if (!checkCategory || checkDub || value === " ") return e.target.value = "";
    if (categoriesFilterList.length < 1) categoriesFilterContainer.removeChild(categoriesFilterContainer.children[0])
    categoriesFilterList.push(value);
    createCategoryFilter(value);
    e.target.value = ""
};
sort.onchange = e => {
    const value = e.target.value;
    const sorted = categoriesFilterList.length > 0 ? filterdProducts : products;
    if (value === "") return;

    if (value === "default") {
        removeProductsContainerChildren();
        for (let i = 0; i < sorted.length; i++) createProductCard(sorted[i]);
        return
    }
    if (value === "stock-high") sorted.sort((a, b) => b.stock - a.stock);

    if (value === "stock-low") sorted.sort((a, b) => a.stock - b.stock)

    removeProductsContainerChildren();
    for (let i = 0; i < sorted.length; i++) createProductCard(sorted[i]);

}
//RENDER
window.onload = async () => await render();