import $ from "jquery";
import {promiseGet, spinner} from "./utilities";
import {AnimalData, SpeciesData} from "./animalData";
import {View} from "./views";
import {SelectedSpecies} from "./selectedSpecies";


/**
 * Load and create base taxonomy categories, cache category levels, categories and taxonomy species
 */
export class TaxonomyView extends View {
    cacheCategoryLevel: CategoryLevelJson[];
    categories: {[key: string]: TaxonomyCategory};
    species: {[key: string]: TaxonomySpecies};

    constructor(animalData: AnimalData, selection: SelectedSpecies, categoryLevels: CategoryLevelJson[], baseCategories: CategoryJson[]) {
        super($("#animals-taxonomic"), animalData, selection);
        this.cacheCategoryLevel = [];
        this.categories = {};
        this.species = {};

        this.rootElem.append(spinner);

        this.cacheCategoryLevel = categoryLevels;
        const baseTaxoCategories: TaxonomyCategory[] = [];
        for (const itemData of baseCategories) {
            const newCategory: TaxonomyCategory = new TaxonomyCategory(itemData, this);
            baseTaxoCategories.push(newCategory);
        }
        this.rootElem.find("img.spinner").remove();
        this.expandBaseCategories(baseTaxoCategories);
    }

    expandBaseCategories(baseCategories: TaxonomyCategory[]): Promise<void> {
        return Promise.all(
            baseCategories.map(x => x.loadSubElements(true, false))
        ).then();
    }

    getCategoryLevel(id: number) {
        return this.cacheCategoryLevel.find(x=>x.category_level_id === id);
    }
}

/**
 * Displays a taxonomy category, in correct location.
 * If necessary, load subcategories and species, potentially recursively.
 * Select/unselect self. Add/remove child species from selection.
 */
class TaxonomyCategory {
    taxonomyView: TaxonomyView;
    id: number;
    name: string;
    levelName: string;
    parentCategoryId: number | null;
    parentCategory: TaxonomyCategory | null;
    selected: boolean;
    uiElement: JQuery<HTMLElement>;
    isOdd: boolean;
    childCategories: TaxonomyCategory[] | null;
    childSpecies: TaxonomySpecies[] | null;

    constructor(categoryData: CategoryJson, taxonomyView: TaxonomyView) {
        this.taxonomyView = taxonomyView;
        this.id = categoryData.category_id;
        this.name = categoryData.name;
        const categoryLevel = taxonomyView.getCategoryLevel(categoryData.category_level_id);
        this.levelName = "{unknown level}";
        if (categoryLevel) {
            this.levelName = categoryLevel.name;
        }
        this.parentCategoryId = categoryData.parent_category_id;
        this.parentCategory = null;
        this.selected = false;
        if (this.parentCategoryId != null) {
            this.parentCategory = taxonomyView.categories[this.parentCategoryId];
            this.selected = this.parentCategory.uiElement.hasClass("selected");
            this.parentCategory.childCategories.push(this);
        }
        this.uiElement = this.render();
        this.isOdd = this.uiElement.parent("ul").hasClass("odd");
        this.childCategories = null;
        this.childSpecies = null;
        // Add self to root taxonomy view's big category dictionary
        taxonomyView.categories[this.id] = this;
    }

    render(): JQuery<HTMLElement> {
        const categoryLiId: string = "category-" + this.id;
        const parentUI: JQuery<HTMLElement> = this.parentCategory == null ? $("#animals-taxonomic") : this.parentCategory.uiElement.find("ul");
        parentUI.append(
            `<li class='category closed ${this.selected ? "selected" : ""}' id='${categoryLiId}'>
                <span onclick='userExpandCategory(${this.id})'>
                <span class='category_name'>${this.name}</span>
                <span class='category_level'>${this.levelName}</span>
                </span>
                <span class='selector' onclick='userSelectCategory(${this.id})'>
                    <img src="images/box_${this.selected ? "checked" : "unchecked"}.svg" alt="${this.selected ? "✔" : "➕"}️"/>
                </span>
                </li>`);
        return $("#" + categoryLiId);
    }

    /**
     * Returns a promise to expand this category
     * @param expand
     * @param recursive
     * @returns {Promise<Array>}
     */
    loadSubElements(expand: boolean, recursive: boolean): Promise<void> {
        this.uiElement.append(spinner);
        let populatedCategoriesPromise: Promise<void[]> = new Promise(resolve => []);
        const self = this;
        if (!this.isPopulated()) {
            self.childCategories = [];
            self.childSpecies = [];
            populatedCategoriesPromise = promiseGet("categories/" + this.id).then(function (categoryObjs: FullCategoryJson[]) {
                const categoryObj = categoryObjs[0];
                // Add base list element
                self.uiElement.append(`<ul class='${self.isOdd ? "even" : "odd"}' style='display: none;'></ul>`);
                // Add subcategories
                for (const itemData of categoryObj.sub_categories) {
                    new TaxonomyCategory(itemData, self.taxonomyView);
                }
                // Add species in category
                for (const itemData of categoryObj.species) {
                    new TaxonomySpecies(itemData, self.taxonomyView);
                }
                // If category contains only 1 subcategory, open the subcategory. (or if recursive is specified)
                let loadCategoryPromises = [];
                if (self.childCategories.length === 1 || recursive) {
                    for(const subCategory of self.childCategories) {
                        loadCategoryPromises.push(subCategory.loadSubElements(expand, recursive));
                    }
                }
                return Promise.all(loadCategoryPromises);
            });
        } else if (recursive) {
            let loadCategoryPromises: Promise<void>[] = [];
            for(const subCategory of self.childCategories) {
                loadCategoryPromises.push(subCategory.loadSubElements(expand, recursive));
            }
            populatedCategoriesPromise = Promise.all(loadCategoryPromises);
        }
        return populatedCategoriesPromise.then(function () {
            if (expand) {
                self.expand();
            }
            self.uiElement.find("img.spinner").remove();
        });
    }

    /**
     * Checks if a category has been populated with subcategory and species data
     * @returns {boolean}
     */
    isPopulated(): boolean {
        return this.childCategories != null;
    }

    expand(): void {
        if (this.uiElement.children("ul").is(":visible")) {
            this.uiElement.find("ul").first().hide();
            this.uiElement.addClass("closed");
            this.uiElement.removeClass("open");
        } else {
            this.uiElement.find("ul").first().show();
            this.uiElement.addClass("open");
            this.uiElement.removeClass("closed");
            if (this.childCategories != null
                && this.childCategories.length === 1
                && !this.childCategories[0].uiElement.children("ul").is(":visible")) {
                this.childCategories[0].expand();
            }
        }
    }

    select(isBeingSelected?: boolean) {
        this.selected = typeof isBeingSelected === "undefined" ? !this.selected : isBeingSelected;
        const checkbox = this.uiElement.find("span.selector img");
        checkbox.attr("src", this.selected ? "images/box_checked.svg" : "images/box_unchecked.svg");
        checkbox.attr("alt", this.selected ? "✔" : "➕");
        if (this.selected) {
            this.uiElement.addClass("selected");
        } else {
            this.uiElement.removeClass("selected");
        }
        if (this.isPopulated()) {
            for (const childCategory of this.childCategories) {
                childCategory.select(this.selected);
            }
            for (const childSpecies of this.childSpecies) {
                if(this.selected) {
                    this.taxonomyView.selection.addSpecies(childSpecies.data.id);
                } else {
                    this.taxonomyView.selection.removeSpecies(childSpecies.data.id);
                }
            }
        }
    }
}

/**
 * Displays a species in the taxonomy view
 */
class TaxonomySpecies {
    data: SpeciesData;
    taxonomyView: TaxonomyView;
    parentCategory: TaxonomyCategory;
    uiElement: JQuery<HTMLElement>;

    constructor(speciesData: SpeciesJson, taxonomyView: TaxonomyView) {
        this.data = taxonomyView.animalData.getOrCreateSpecies(speciesData);
        this.taxonomyView = taxonomyView;

        this.parentCategory = this.taxonomyView.categories[this.data.parentCategoryId];
        const categorySelected: boolean = this.parentCategory.uiElement.hasClass("selected");
        const alreadySelected: boolean = this.taxonomyView.selection.containsSpecies(this.data.id);
        this.uiElement = this.render(categorySelected || alreadySelected);

        // Add self to parent category and taxonomyView dict
        this.taxonomyView.species[this.data.id] = this; // this is fine
        // If selected, add to selection:
        if(categorySelected) {
            this.taxonomyView.selection.addSpecies(this.data.id);
        }
        this.parentCategory.childSpecies.push(this);
    }

    render(selected: boolean): JQuery<HTMLElement> {
        const speciesLiId = `species-${this.data.id}`;
        const parentUlElement = this.parentCategory.uiElement.find("ul");
        parentUlElement.append(`<li class='species ${selected ? "selected" : ""} ${speciesLiId}'>
                <span class='selector' onclick='userSelectSpecies(${this.data.id})'>
                    <span class='species_name'>${this.data.commonName} </span>
                    <span class='latin_name'>${this.data.latinName}</span>
                    <img src="images/box_${selected ? "checked" : "unchecked"}.svg" alt="${selected ? "✔" : "➕"}️"/>
                </span>
                </li>`);
        return $(`#${speciesLiId}`);
    }
}