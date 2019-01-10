
import {PhylogeneticTree} from "../api/generated/CBioPortalAPI";

export type PhylogeneticTreeData = {
    patient?: {
        id: string,
        data: PhylogeneticTree[]
    },
    nodes?: any[]//PDXNode[],
};