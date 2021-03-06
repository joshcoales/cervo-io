import {Spinner} from "@cervoio/common-ui-lib/src/components/images/Spinner";
import {SelectedZooResult} from "./SelectedZooResult";
import React from "react";
import {ZooJson} from "@cervoio/common-lib/src/apiInterfaces";
import {PostcodeEntry} from "./PostcodeEntry";

const styles = require("./SelectedZoosList.css")

interface SelectedZoosListProps {
    selectedZoos: ZooJson[];
    onSelectZoos: (zoo: ZooJson) => void;
    zooDistances: Map<number, number>;
    loadingDistances: boolean;
    loadingZoos: boolean;

    postcode: string;
    postcodeError: boolean;
    onPostcodeUpdate: (e: React.FormEvent<HTMLInputElement>) => void;
}

export const SelectedZoosList: React.FunctionComponent<SelectedZoosListProps> = (props) => {

    // handle ordering of zoos here.
    const cmp:(a: boolean | number | undefined, b: boolean | number | undefined) => number = (a, b) => {
        if (a === undefined && b === undefined) return 0;
        if (a === undefined) return +1;
        if (b === undefined) return -1;
        if (a > b) return +1;
        if (a < b) return -1;
        return 0;
    }
    const compareZoos = (a: ZooJson, b: ZooJson) => {
        return cmp(!props.zooDistances.has(a.zoo_id), !props.zooDistances.has(b.zoo_id))
            || cmp(props.zooDistances.get(a.zoo_id), props.zooDistances.get(b.zoo_id))
            || a.name.localeCompare(b.name)
    }

    const orderedZoos = props.selectedZoos.sort(compareZoos);

    return <>
        <h2 className={styles.title}>
            Zoos with selected species ({props.selectedZoos.length})
        </h2>
        <PostcodeEntry
            postcode={props.postcode}
            error={props.postcodeError}
            onUpdate={props.onPostcodeUpdate}
            isLoading={props.loadingDistances}
        />
        {props.loadingDistances || props.loadingZoos ? <Spinner/> : ""}
        <ul id="selected-zoos">
            {orderedZoos.map((zoo) => {
                const onSelect = props.onSelectZoos.bind(null, zoo);
                return <SelectedZooResult
                    key={zoo.zoo_id}
                    zoo={zoo}
                    onSelect={onSelect}
                    distance={props.zooDistances.get(zoo.zoo_id)}
                />
            })}
        </ul>
        </>
}