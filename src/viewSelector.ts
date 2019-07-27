import {AnimalData, CategoryData} from "./animalData";
import {SelectedSpecies} from "./selectedSpecies";
import {TaxonomyView} from "./taxonomyView";
import {AlphabetView} from "./alphabetView";
import {SearchView} from "./searchView";
import $ from "jquery";
import {View} from "./views";
import {promiseSpinner} from "./utilities";

/**
 * Handle (and update) which view is active
 */
export class ViewSelector {
    views: {[key: string]: View};
    viewKeys: string[];
    activeView: string | null;

    constructor(animalData: AnimalData, selection: SelectedSpecies) {
        this.views = {
            "taxonomical": null,
            "alphabetical": null,
            "search": new SearchView(animalData, selection)
        };
        this.viewKeys = ["taxonomical", "alphabetical", "search"];
        this.activeView = null;
        const viewSelector = this;
        this.initialiseViews(animalData, selection).then(function() {
            viewSelector.update();
            viewSelector.wireUpdates();
        });
    }

    initialiseViews(animalData: AnimalData, selection: SelectedSpecies): Promise<void> {
        const rootElem = $("#animals-taxonomic");
        const viewSelector = this;
        return Promise.all(
            [
                this.initialiseTaxonomyView(animalData, selection),
                this.initialiseAlphabetView(animalData, selection)
            ]
        ).then(function (views) {
            viewSelector.views["taxonomical"] = views[0];
            viewSelector.views["alphabetical"] = views[1];
        }, function(err) {
            console.log(err);
            rootElem.append("<span class=\"error\">Failed to connect to API</span>");
        });
    }

    initialiseTaxonomyView(animalData: AnimalData, selection: SelectedSpecies): Promise<TaxonomyView> {
        const rootElem = $("#animals-taxonomic");
        // Create promise to create taxonomy view
        let taxoPromise = Promise.all(
            [
                animalData.promiseCategoryLevels(),
                animalData.promiseBaseCategories()
            ]
        ).then(function (data: [CategoryLevelJson[], CategoryData[]]) {
            return new TaxonomyView(animalData, selection, data[0], data[1]);
        });
        taxoPromise = promiseSpinner(rootElem,taxoPromise);
        // Promise to expand the taxonomy view
        const expandBasePromise = taxoPromise.then(function(taxonomyView) {
            return taxonomyView.expandBaseCategories();
        }).then();
        // When both are done, return the taxonomy view
        return Promise.all([taxoPromise, expandBasePromise]).then(function(data: [TaxonomyView, void]) {
            return data[0];
        });
    }

    initialiseAlphabetView(animalData: AnimalData, selection: SelectedSpecies): Promise<AlphabetView> {
        return animalData.promiseValidFirstLetters().then(function(validLetters) {
            return new AlphabetView(animalData, selection, validLetters);
        });
    }

    wireUpdates() {
        $("input[name=selector-type]").change($.proxy(this.update, this));
    }

    update() {
        this.activeView = <string>$('input[name=selector-type]:checked').val();
        for(const key of this.viewKeys) {
            if (this.activeView === key) {
                this.views[key].rootElem.show();
            } else {
                this.views[key].rootElem.hide();
            }
        }
    }
}