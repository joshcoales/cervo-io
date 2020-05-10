import * as React from "react";
import {TaxonomySpecies} from "./TaxonomySpecies";
import {HiddenStatus} from "./admin/HiddenStatus";
import {TaxonomyCategoryState} from "../../taxonomyState";
import {NewCategoryJson, NewSpeciesJson} from "../../../../common-lib/src/apiInterfaces";
import {CategorySelector} from "./CategorySelector";
import {EditTaxonomyForm} from "./admin/EditTaxonomyForm";
import classNames from "classnames";

const styles = require("./StatedTaxonomyCategory.css")

interface StatedTaxonomyCategoryProps {
    category: TaxonomyCategoryState;
    path: number[];
    odd: boolean;
    selectedSpecies: number[];
    onExpandCategory: (categoryPath: number[]) => Promise<void>;
    onSelectCategory: (categoryPath: number[]) => Promise<void> | null;
    onSelectSpecies: (speciesId: number) => void | null;
    editableTaxonomy: boolean;
    onAddCategory: (categoryParentPath: number[], newCategory: NewCategoryJson) => Promise<void> | null;
    onAddSpecies: (categoryParentPath: number[], newSpecies: NewSpeciesJson) => Promise<void> | null;
}
interface StatedTaxonomyCategoryState {

}
export class StatedTaxonomyCategory extends React.Component<StatedTaxonomyCategoryProps, StatedTaxonomyCategoryState> {
    render() {
        const liClassName = classNames(
            styles.category,
            {
                [styles.open]: this.props.category.expanded,
                [styles.closed]: !this.props.category.expanded,
                [styles.selected]: this.props.category.selected
            }
        )
        const ulClassName = classNames(
            {
                [styles.even]: this.props.odd,
                [styles.odd]: !this.props.odd,
                [styles.hidden]: !this.props.category.expanded
            }
        )
        const selectableSpecies = !!this.props.onSelectSpecies;
        const selectableCategories = !!this.props.onSelectCategory;
        const selectCategory = selectableCategories ? this.props.onSelectCategory.bind(null, this.props.path) : null;
        return <li className={liClassName}>
            <span className={styles.clickable} onClick={this.props.onExpandCategory.bind(null, this.props.path)}>
                <span className={styles.categoryName}>{this.props.category.data.name}</span>
                <span className={styles.categoryLevel}>{this.props.category.categoryLevel}</span>
                {this.props.editableTaxonomy && <HiddenStatus hidden={this.props.category.data.hidden}/>}
            </span>
            <CategorySelector selectCategory={selectCategory} selected={this.props.category.selected}/>
            <ul className={ulClassName}>
                {this.props.editableTaxonomy && <EditTaxonomyForm
                    parentCategory={this.props.category}
                    addCategory={this.props.onAddCategory.bind(null, this.props.path)}
                    addSpecies={this.props.onAddSpecies.bind(null, this.props.path)}
                />}
                {this.props.category.subCategories.map(
                    (category) =>
                        <StatedTaxonomyCategory
                            key={"category-" + category.data.id}
                            category={category}
                            path={this.props.path.concat([category.data.id])}
                            odd={!this.props.odd}
                            selectedSpecies={this.props.selectedSpecies}
                            onExpandCategory={this.props.onExpandCategory}
                            onSelectCategory={selectableCategories ? this.props.onSelectCategory : null}
                            onSelectSpecies={selectableSpecies ? this.props.onSelectSpecies : null}
                            editableTaxonomy={this.props.editableTaxonomy}
                            onAddCategory={this.props.editableTaxonomy ? this.props.onAddCategory : null}
                            onAddSpecies={this.props.editableTaxonomy ? this.props.onAddSpecies : null}
                        />
                )}
                {this.props.category.species.map(
                    (species) =>
                        <TaxonomySpecies
                            key={"species-" + species.data.id}
                            species={species.data}
                            selected={this.props.selectedSpecies.includes(species.data.id)}
                            onSelect={this.props.onSelectSpecies == null ? null : this.props.onSelectSpecies.bind(null, species.data.id)}
                            editableTaxonomy={this.props.editableTaxonomy}
                            odd={!this.props.odd}
                        />
                )}
            </ul>
        </li>
    }
}