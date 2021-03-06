import React, {useState} from "react";
import {SpeciesData} from "../../animalData";
import {ViewProps} from "../../views";
import {Spinner} from "../images/Spinner";
import {withLoading} from "../../utilities";
import {SearchNoResults} from "./SearchNoResults";
import {SelectableSpeciesEntry} from "../speciesEntry/SelectableSpeciesEntry";

const styles = require("./SearchView.css")

export const SearchViewComponent: React.FunctionComponent<ViewProps> = (props) => {
    const [searchTerm, setSearchTerm] = useState("")
    const [lastSearch, setLastSearch] = useState("")
    const [speciesList, setSpeciesList] = useState<SpeciesData[]>([])
    const [isLoading, setIsLoading] = useState(false);

    const onUpdate = (e: React.FormEvent<HTMLInputElement>) => {
        e.preventDefault();
        setSearchTerm(e.currentTarget.value)
    }

    const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const cleanSearch = searchTerm.trim()
        if (cleanSearch.length == 0) {
            return
        }
        setLastSearch(cleanSearch);
        await withLoading(setIsLoading, async () => {
            const species = await props.animalData.promiseSearchSpecies(cleanSearch);
            setSpeciesList(species)
        })
    }

    const speciesElements = speciesList.map(
        (species) =>
            <SelectableSpeciesEntry
                key={species.id}
                species={species}
                selectedSpeciesIds={props.selectedSpeciesIds}
                showLatinName={true}
                onSelectSpecies={props.onSelectSpecies}
                searchTerm={lastSearch}
            />
    );
    return (
        <div className={styles.searchView}>
            <form onSubmit={onSubmit}>
                <label>
                    Search:
                    <input type="text" value={searchTerm} onChange={onUpdate}/>
                </label>
                <input type="submit"/>
                {isLoading ? <Spinner/> : ""}
            </form>
            <ul>
                {
                    lastSearch.length > 0
                        ? (
                            speciesElements.length > 0
                                ? speciesElements
                                : <SearchNoResults searchTerm={lastSearch}/>
                        )
                        : <></>
                }
            </ul>
        </div>
    )
}
