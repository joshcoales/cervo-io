/**
 * Store data about known species
 */
import {promiseDelete, promiseGet, promisePost} from "./utilities";
import {
    CategoryJson,
    CategoryLevelJson,
    FullCategoryJson,
    FullSpeciesJson, FullZooJson, NewCategoryJson, NewSpeciesJson, NewZooSpeciesLinkJson,
    SpeciesJson, ZooDistanceCache, ZooDistanceJson,
    ZooJson, ZooSpeciesLinkJson
} from "@cervoio/common-lib/src/apiInterfaces";


export class AnimalData {
    token?: string;
    species: Map<number, SpeciesData>;
    categories: Map<number, CategoryData>;
    categoryLevels?: Promise<CategoryLevelJson[]>;
    baseCategory?: Promise<CategoryData[]>;
    validFirstLetters?: Promise<string[]>;
    speciesByLetter: Map<string, Promise<SpeciesData[]>>;
    cacheZooDistances: { [key: string]: { [key: string]: number } } = {};
    fullZoos: Map<number, FullZooJson>;
    private _listZoos?: ZooJson[];
    private _listedSpecies: boolean = false;

    constructor(token?: string) {
        this.token = token;
        this.species = new Map<number, SpeciesData>();
        this.categories = new Map<number, CategoryData>();
        this.speciesByLetter = new Map<string, Promise<SpeciesData[]>>();
        this.fullZoos = new Map();
    }

    getPath(path: string): Promise<any> {
        let authHeaders: Map<string, string> | undefined = undefined;
        if (this.token) {
            authHeaders = new Map([["authorization", this.token]]);
        }
        return promiseGet(path, authHeaders);
    }

    postPath(path: string, data: any): Promise<any> {
        let authHeaders: Map<string, string> | undefined = undefined;
        if (this.token) {
            authHeaders = new Map([["authorization", this.token]]);
        }
        return promisePost(path, data, authHeaders);
    }

    deletePath(path: string, data: any): Promise<any> {
        let authHeaders: Map<string, string> | undefined = undefined;
        if (this.token) {
            authHeaders = new Map([["authorization", this.token]]);
        }
        return promiseDelete(path, data, authHeaders);
    }

    promiseCategoryLevels(): Promise<CategoryLevelJson[]> {
        if (!this.categoryLevels) {
            this.categoryLevels = this.getPath("category_levels/");
        }
        return this.categoryLevels;
    }

    promiseBaseCategories(): Promise<CategoryData[]> {
        if (!this.baseCategory) {
            const self = this;
            this.baseCategory = this.getPath("categories/").then(function (data: CategoryJson[]) {
                return data.map(x => self.getOrCreateCategory(x));
            });
        }
        return this.baseCategory;
    }

    promiseValidFirstLetters(): Promise<string[]> {
        if (!this.validFirstLetters) {
            this.validFirstLetters = this.getPath("species/valid_first_letters/");
        }
        return this.validFirstLetters;
    }

    promiseSpeciesByLetter(letter: string): Promise<SpeciesData[]> {
        let letterPromise = this.speciesByLetter.get(letter);
        if (!letterPromise) {
            const self = this;
            letterPromise = this.getPath(`species/?common_name=${letter}%25`).then(function (data: SpeciesJson[]) {
                return data.map(x => self.getOrCreateSpecies(x));
            });
            this.speciesByLetter.set(letter, letterPromise);
        }
        return letterPromise;
    }

    promiseSearchSpecies(search: string): Promise<SpeciesData[]> {
        const self = this;
        return this.getPath(`species/?name=%25${search}%25`).then(function (animals: SpeciesJson[]) {
            return animals.map(x => self.getOrCreateSpecies(x));
        });
    }

    getOrCreateCategory(categoryJson: CategoryJson): CategoryData {
        const categoryId = categoryJson.category_id;
        let categoryData = this.categories.get(categoryId)
        if (!categoryData) {
            categoryData = new CategoryData(categoryJson, this);
            this.categories.set(categoryId, categoryData);
        }
        return categoryData;
    }

    getOrCreateSpecies(speciesJson: SpeciesJson): SpeciesData {
        const speciesId = speciesJson.species_id
        let speciesData = this.species.get(speciesId)
        if (!speciesData) {
            speciesData = new SpeciesData(speciesJson, this);
            this.species.set(speciesId, speciesData);
        }
        return speciesData
    }

    cacheAddZooDistances(postcode: string, zooDistanceData: ZooDistanceJson[]) {
        if (!this.cacheZooDistances[postcode]) {
            this.cacheZooDistances[postcode] = {};
        }
        for (const val of zooDistanceData) {
            this.cacheZooDistances[postcode][val.zoo_id] = val.metres;
        }
    }

    async promiseGetZooDistances(postcode: string, zooKeys: string[]): Promise<ZooDistanceCache[]> {
        let zoosNeedingDistance = zooKeys;
        let foundDistances: ZooDistanceCache[] = [];
        if (this.cacheZooDistances[postcode]) {
            zoosNeedingDistance = [];
            for (const zooKey of zooKeys) {
                if (this.cacheZooDistances[postcode][zooKey]) {
                    foundDistances.push({
                        zoo_id: Number(zooKey),
                        metres: this.cacheZooDistances[postcode][zooKey]
                    });
                } else {
                    zoosNeedingDistance.push(zooKey);
                }
            }
        }
        if (zoosNeedingDistance.length === 0) {
            return foundDistances;
        }
        //create url to request
        let path = `zoo_distances/${postcode}/` + zoosNeedingDistance.join(",");
        //get response
        const newDistances = await this.getPath(path);
        this.cacheAddZooDistances(postcode, newDistances);
        return foundDistances.concat(newDistances);
    }

    async promiseFullZoo(zooId: number): Promise<FullZooJson> {
        const zooData = this.fullZoos.get(zooId)
        if (zooData) {
            return zooData;
        }
        const fullData = await this.getPath(`zoos/${zooId}`);
        this.fullZoos.set(zooId, fullData[0]);
        return fullData[0];
    }

    async listZoos(): Promise<ZooJson[]> {
        if (this._listZoos) {
            return this._listZoos;
        }
        const listZoos = await this.getPath("zoos/");
        this._listZoos = listZoos;
        return listZoos;
    }

    async listSpecies(): Promise<SpeciesData[]> {
        if (!this._listedSpecies) {
            const listSpecies: SpeciesJson[] = await this.getPath("species/");
            const self = this;
            listSpecies.forEach(function (species: SpeciesJson) {
                if (!self.species.has(species.species_id)) {
                    const newSpecies = new SpeciesData(species, self);
                    self.species.set(species.species_id, newSpecies);
                }
            });
        }
        return Array.from(this.species.values());
    }

    async addCategory(newCategory: NewCategoryJson): Promise<CategoryData> {
        const category: CategoryJson = await this.postPath("categories/", newCategory);
        const categoryId = category.category_id;
        let categoryData = this.categories.get(categoryId)
        if (!categoryData) {
            categoryData = new CategoryData(category, this);
            this.categories.set(categoryId, categoryData);
        }
        return categoryData;
    }

    async addSpecies(newSpecies: NewSpeciesJson): Promise<SpeciesData> {
        const species: SpeciesJson = await this.postPath("species/", newSpecies);
        const speciesId = species.species_id;
        let speciesData = this.species.get(speciesId)
        if (!speciesData) {
            speciesData = new SpeciesData(species, this);
            this.species.set(speciesId, speciesData);
        }
        return speciesData
    }

    async addZooSpeciesLink(zooId: number, speciesId: number): Promise<ZooSpeciesLinkJson> {
        const zooSpecies: NewZooSpeciesLinkJson = {
            zoo_id: zooId,
            species_id: speciesId
        };
        return await this.postPath("zoo_species/", zooSpecies);
    }

    async deleteZooSpeciesLink(zooId: number, speciesId: number): Promise<void> {
        const zooSpecies: NewZooSpeciesLinkJson = {
            zoo_id: zooId,
            species_id: speciesId
        };
        await this.deletePath("zoo_species/", zooSpecies);
    }
}

export class CategoryData {
    animalData: AnimalData;
    id: number;
    name: string;
    categoryLevelId: number;
    parentCategoryId: number | null;
    hidden: boolean;
    _fullDataPromise: Promise<FullCategoryJson> | null;
    subCategories: Promise<CategoryData> | null;
    species: Promise<SpeciesData> | null;

    constructor(categoryData: CategoryJson, animalData: AnimalData) {
        this.animalData = animalData;
        this.id = categoryData.category_id;
        this.name = categoryData.name;
        this.categoryLevelId = categoryData.category_level_id;
        this.parentCategoryId = categoryData.parent_category_id;
        this.hidden = categoryData.hidden;
        this._fullDataPromise = null;
        this.subCategories = null;
        this.species = null;
    }

    async promiseFullData(): Promise<FullCategoryJson> {
        if (!this._fullDataPromise) {
            this._fullDataPromise = this.animalData.getPath("categories/" + this.id).then(function (data: FullCategoryJson[]) {
                return data[0];
            });
        }
        return this._fullDataPromise;
    }

    async getSubCategories(): Promise<CategoryData[]> {
        const self = this;
        return this.promiseFullData().then(function (data: FullCategoryJson) {
            return data.sub_categories.map(x => self.animalData.getOrCreateCategory(x));
        });
    }

    async getSpecies(): Promise<SpeciesData[]> {
        const self = this;
        return this.promiseFullData().then(function (data: FullCategoryJson) {
            return data.species.map(x => self.animalData.getOrCreateSpecies(x));
        });
    }

    async getCategoryName(): Promise<string> {
        const categoryLevels = await this.animalData.promiseCategoryLevels();
        const matching = categoryLevels.filter((level) => level.category_level_id == this.categoryLevelId);
        if (matching.length) {
            return matching[0].name;
        } else {
            return "(unknown rank)";
        }
    }
}

/**
 * Stores species info, and lists of zoos the species appear in
 */
export class SpeciesData {
    animalData: AnimalData;
    id: number;
    commonName: string;
    latinName: string;
    parentCategoryId: number;
    hidden: boolean;
    zooList: Promise<ZooJson[]> | null;

    constructor(speciesData: SpeciesJson, animalData: AnimalData) {
        this.animalData = animalData;
        this.id = speciesData.species_id;
        this.commonName = speciesData.common_name;
        this.latinName = speciesData.latin_name;
        this.parentCategoryId = speciesData.category_id;
        this.hidden = speciesData.hidden;
        this.zooList = null;
    }

    async getZooList(): Promise<ZooJson[]> {
        if (this.zooList == null) {
            this.zooList = this.animalData.getPath("species/" + this.id).then(function (data: FullSpeciesJson[]) {
                return data[0].zoos;
            });
        }
        return this.zooList;
    }
}