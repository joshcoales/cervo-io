import React, {useState} from "react";
import {SpeciesData} from "../../animalData";
import {ViewProps} from "../../views";
import {Spinner} from "../images/Spinner";
import {SearchResult} from "./SearchResult";


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
        setLastSearch(searchTerm);
        setIsLoading(true)
        const species = await props.animalData.promiseSearchSpecies(searchTerm);
        setSpeciesList(species)
        setIsLoading(false)
    }

    const speciesElements = speciesList.map(
        (species) =>
            <SearchResult
                key={species.id}
                species={species}
                searchTerm={lastSearch}
                selectedSpeciesIds={props.selectedSpeciesIds}
                onSelectSpecies={props.onSelectSpecies}
            />
    );
    return (
        <div>
            <form onSubmit={onSubmit}>
                <label>
                    Search:
                    <input type="text" value={searchTerm} onChange={onUpdate}/>
                </label>
                <input type="submit"/>
                {isLoading ? <Spinner/> : ""}
            </form>
            <ul>
                {speciesElements}
            </ul>
        </div>
    )
}
