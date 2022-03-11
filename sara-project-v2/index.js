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

//STATE
let total = 0;
const productTemplate = document.querySelector("#product-template");
const categoryTemplate = document.querySelector("#category-template");
const fetchCategoryTemplate = document.querySelector("#fetch-category-template")
//LOCAL STORAGE VARIABLES
let productsSlugs = JSON.parse(localStorage.getItem("products_slugs")) || [];
const postedProducts = JSON.parse(localStorage.getItem("posted_products")) || [];
const productsData = JSON.parse(localStorage.getItem("products_data")) || [];
const categoriesList = JSON.parse(localStorage.getItem("categories_list")) || [];
const categoriesFetchFilterList = JSON.parse(localStorage.getItem("fetch_categories_filter")) || [];
const nextSlugsFetchDate = JSON.parse(localStorage.getItem("next_slugs_fetch_date")) || '';
const nextDataFetchDate = JSON.parse(localStorage.getItem("next_data_fetch_date")) || '';
const limt = JSON.parse(localStorage.getItem("limt")) || 80;


//SHUFFLE PRODUCTS
const shuffle = async (arr) => {
    for (let i = 0; i < arr.length; i++) {
        const random = Math.floor(Math.random() * i)
        const temp = arr[i];
        arr[i] = arr[random];
        arr[random] = temp;
    }
    return arr.map(product => (product.slug));
}
//RENDER DATA

const render = async () => {
    const today = dayjs().format("M/D/YYYY");
    const nextFetch = dayjs(nextSlugsFetchDate);
    const checkDate = nextFetch.diff(today, "d")
    //CHECK LOCALSTORAGE INFORMATION DATE
    if (!nextSlugsFetchDate || productsSlugs.length < 1 || checkDate < 1) {
        //FETCH AND STORE CATEGORIES 
        fetchAndStoreCategories()
        //FETCH AND STORE PRODUCTS 
        const storedTitles = await fetchAndStoreProductsTitles()
        //RENDER DATA IN THE DOM
        await fetchProductsData(storedTitles)

    } else {
        await fetchProductsData()
        for (let i = 0; i < categoriesList.length; i++) createCategoryOption(categoriesList[i])

        for (let i = 0; i < categoriesFetchFilterList.length; i++) {
            const { name, amout } = categoriesFetchFilterList[i];
            createCategoryFetchFilter(name, amout)
            total += 1;
        }
        console.log(total);
        totalProducts.textContent = `Total (${total} / ${limt})`

    }
};

//FETCH PRODUCTS TITLES  
const fetchAndStoreProductsTitles = async () => {
    //FETCH PRODUCTS DATA
    const url = "https://api.ardunic.com/v1/products?s=20000";
    let res = await fetch(url, { method: "GET" });
    res = await res.json();
    const shuffled = await shuffle(res.data)

    //STORE ALL PRODUCTS SLUGS
    localStorage.setItem("products_slugs", JSON.stringify(shuffled));

    //STORE THE NEXT FETCH DATE
    localStorage.setItem("next_slugs_fetch_date", JSON.stringify(dayjs().add(7, 'days').format("M/D/YYYY")));
    return shuffled
}

//FETCH PRODUCTS DATA  
const fetchProductsData = async passedData => {
    const data = passedData || productsSlugs;
    //DISABLE CATEGORIES FILTER INPUT
    categoriesFilterInput.disabled = true
    categoriesFilterInput.style.cursor = "not-allowed"
    sort.disabled = true
    sort.style.cursor = "not-allowed"
    //LOOP OVER PRODUCTS
    const today = dayjs().format("M/D/YYYY")
    const nextFetch = dayjs(nextDataFetchDate);
    const checkDate = nextFetch.diff(today, "d")

    if (!nextDataFetchDate || nextDataFetchDate === NaN || products.length < 1 || checkDate < 1) {
        await fetchAndStoreProductsData(data)
        localStorage.setItem("products_data", JSON.stringify(products));
        localStorage.setItem("next_data_fetch_date", JSON.stringify(dayjs().add(1, 'days').format("M/D/YYYY")));
    }
    if (products.length > 0) {
        total = 0;
        for (let i = 0; i < products.length; i++) {
            const { categories, title } = products[i];
            const check = postedProducts.length > 0 ? postedProducts.some(p => p === title) : false;
            if (!check) createProductCard(products[i])
        }
        totalProducts.textContent = `Total (${total} / ${products.length})`
    }
    categoriesFilterInput.disabled = false
    categoriesFilterInput.style.cursor = "auto"
    sort.disabled = false
    sort.style.cursor = "auto"
};
//FETCH ALL CATEGORIES
const fetchAndStoreCategories = async () => {
    const url = "https://api.ardunic.com/v1/sections";
    let res = await fetch(url, { method: "GET", headers: { "Content-Type": "application/json" } });
    res = await res.json();
    const categories = []
    console.log(res.data);
    for (let i = 0; i < res.data.length; i++) {
        const { name, } = res.data[i];
        createCategoryOption(name);
        categories.push(name)
    }
    localStorage.setItem("categories_list", JSON.stringify(categories))
}
//FETCH PRODUCTS DATA ONCE A DAY AND STORE IT IN LOCALSTORAGE
const fetchAndStoreProductsData = async (data) => {
    total = 0;
    for (let i = 0; i < data.length; i++) {
        if (products.length >= limt) break;
        //FETCH SINGLE PRODUCT DATA EVER LOOP
        const url = `https://api.ardunic.com/v1/product/${data[i]}`;

        let res = await fetch(url, { method: "GET", headers: { "Content-Type": "application/json" } });
        res = await res.json();
        const { title, images, stock, categories, types, mostSale, price } = res.data;

        //CHECK IF THE PRODUCT IS EMPTY
        if (stock > 1 || types.length > 1) {

            //CHECK IF THE ELEMENT IS POSTED
            const check = postedProducts.length > 0 ? postedProducts.some(p => p === title) : false;
            if (!check) {
                products.push({ title, images, stock, categories, mostSale, price: price.showPrice })

                //CREATE THE PRODUCT CARD IN THE DOM
                createProductCard({ title, images, stock, categories, mostSale, price: price.showPrice });
                total += 1
                totalProducts.textContent = `Total (${total} / ${limt})`
            }
        }
    };
}
//CREATE DOM ELEMENTS
const createProductCard = ({ title, images, stock, mostSale, price }) => {
    const clone = productTemplate.cloneNode(true);
    clone.style.display = 'flex';
    const { children } = clone;
    children[0].src = `https://ardunic-images.s3.eu-central-1.amazonaws.com/${images[0]}`
    children[1].textContent = title;
    children[2].children[0].textContent = `Price ${new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'IQD' }).format(price)}`;
    children[2].children[2].textContent = stock < 1 ? `Product Contains Types` : `Stock ${stock}`;
    children[2].children[3].textContent = ` , Sales ${mostSale}`;

    //ADD POSTED FUNCTION
    children[2].children[5].onclick = e => {
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
        for (let j = 0; j < categories.length; j++) {
            const { sections } = categories[j];
            for (let x = 0; x < sections.length; x++) {
                if (categoriesFilterList.some(c => c === sections[x].name)) {
                    if (!filterdProducts.some(p => p.title === title) && !postedProducts.some(p => p === title)) {
                        filterdProducts.push(products[i])
                    }
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
    total = 0;
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
        totalProducts.textContent = `Total (${total} / ${limt})`

    } else {
        total = 0;
        for (let i = 0; i < products.length; i++) {
            const { categories, title } = products[i];
            for (let j = 0; j < categories.length; j++) {
                const { sections } = categories[j];
                for (let x = 0; x < sections.length; x++) {
                    if (categoriesFilterList.some(c => c === sections[x].name)) {
                        if (!filterdProducts.some(p => p.title === title) && !postedProducts.some(p => p === title)) {
                            total += 1
                            filterdProducts.push(products[i])
                            createProductCard(products[i])
                        }
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
fetchCategoryBtn.onclick = () => {
    const name = categoryFetchFilterName.value;
    const amount = categoryFetchFilterAmount.value;
    const check = categoriesFetchFilterList.some(c => c.name === name);

    if (check || amount === " " || amount === "" || name === "" || name === " ") return;
    categoriesFetchFilterList.push({ name, amount });
    localStorage.setItem("fetch_categories_filter", JSON.stringify(categoriesFetchFilterList));
    createCategoryFetchFilter(name, amount)
}
limtInput.oninput = e => {
    localStorage.setItem("limt", JSON.stringify(e.target.value))
}
categoriesFilterInput.onchange = e => {
    const value = e.target.value;
    if (categoriesFilterList.some(category => category === value) || value === " ") return e.target.value = "";
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

    if (value === "buy-score-high") sorted.sort((a, b) => b.mostSale - a.mostSale);

    if (value === "buy-score-low") sorted.sort((a, b) => a.mostSale - b.mostSale);
    removeProductsContainerChildren();
    for (let i = 0; i < sorted.length; i++) createProductCard(sorted[i]);

}
//RENDER
window.onload = async () => await render();