import * as React from 'react';
import * as _ from 'lodash';
import $ from 'jquery';
import { default as ReactBootstrap} from 'react-bootstrap';
import GenomicOverview from './genomicOverview/GenomicOverview';
import { ClinicalData } from "shared/api/generated/CBioPortalAPI";
import { ClinicalDataBySampleId } from "../../shared/api/api-types-extended";
import { RequestStatus } from "../../shared/api/api-types-extended";
import FeatureTitle from '../../shared/components/featureTitle/FeatureTitle';
import {If, Then, Else} from 'react-if';
import SampleManager from './sampleManager';
import SelectCallback = ReactBootstrap.SelectCallback;
import {ThreeBounce} from 'better-react-spinkit';
import PatientHeader from './patientHeader/PatientHeader';
import {PaginationControls} from "../../shared/components/paginationControls/PaginationControls";
import { PatientViewPageStore } from './clinicalInformation/PatientViewPageStore';
import ClinicalInformationPatientTable from "./clinicalInformation/ClinicalInformationPatientTable";
import ClinicalInformationSamples from "./clinicalInformation/ClinicalInformationSamplesTable";
import {observer, inject } from "mobx-react";
import {getSpanElementsFromCleanData} from './clinicalInformation/lib/clinicalAttributesUtil.js';
import CopyNumberTableWrapper from "./copyNumberAlterations/CopyNumberTableWrapper";
import {reaction, computed, autorun, IReactionDisposer} from "mobx";
import Timeline from "./timeline/Timeline";
import {default as PatientViewMutationTable} from "./mutation/PatientViewMutationTable";
import PathologyReport from "./pathologyReport/PathologyReport";
import { MSKTabs, MSKTab } from "../../shared/components/MSKTabs/MSKTabs";
import { validateParametersPatientView } from '../../shared/lib/validateParameters';
import LoadingIndicator from "shared/components/loadingIndicator/LoadingIndicator";
import ValidationAlert from "shared/components/ValidationAlert";
import AjaxErrorModal from "shared/components/AjaxErrorModal";
import AppConfig from 'appConfig';
import { getMouseIcon } from './SVGIcons';

import './patient.scss';
import IFrameLoader from "../../shared/components/iframeLoader/IFrameLoader";

// Phylogenetic tree requirements
import PhylogeneticTreeComponent from '../../shared/components/phylogeneticTree/PhylogeneticTreeComponent';
import { PhylogeneticTreeData } from '../../shared/model/PhylogeneticTreeData';
import {PhylogeneticTree} from "../../shared/api/generated/CBioPortalAPI";

const patientViewPageStore = new PatientViewPageStore();

(window as any).patientViewPageStore = patientViewPageStore;

export interface IPatientViewPageProps {
    routing: any;
    samples?: ClinicalDataBySampleId[];
    loadClinicalInformationTableData?: () => Promise<any>;
    patient?: {
        id: string,
        clinicalData: ClinicalData[]
    };
    clinicalDataStatus?: RequestStatus;
}

// Node colours for phylogenetic tree - this is not a smart way to do it as it does not deal well with non-conformant map indexes
const nodeColours: {[index: string] : string } = {
    '1': '#A6CEE3',
    '2': '#1F78B4',
    '3': '#B2DF8A',
    '4': '#33A02C',
    '5': '#FB9A99',
    '6': '#E31A1C',
    '7': '#FDBF6F',
    '8': '#FF7F00',
    '9': '#CAB2D6',
    '10': '#6A3D9A',
    '11': '#FFFF99',
    '12': '#B15928'
}


@inject('routing')
@observer
export default class PatientViewPage extends React.Component<IPatientViewPageProps, {}> {

    private updatePageTitleReaction: IReactionDisposer;

    constructor(props: IPatientViewPageProps) {

        super();

        //TODO: this should be done by a module so that it can be reused on other pages
        const reaction1 = reaction(
            () => props.routing.location.query,
            query => {

                const validationResult = validateParametersPatientView(query);

                if (validationResult.isValid) {

                    patientViewPageStore.urlValidationError = null;

                    if ('studyId' in query) {
                        patientViewPageStore.studyId = query.studyId;
                    }
                    if ('caseId' in query) {
                        patientViewPageStore.setPatientId(query.caseId as string);
                    } else if ('sampleId' in query)
                    {
                        patientViewPageStore.setSampleId(query.sampleId as string);
                    }

                    let patientIdsInCohort = ('navCaseIds' in query ? (query.navCaseIds as string).split(",") : []);

                    patientViewPageStore.patientIdsInCohort = patientIdsInCohort.map(entityId=>{
                        return entityId.includes(':') ? entityId : patientViewPageStore.studyId + ':' + entityId;
                    });
                } else {
                    patientViewPageStore.urlValidationError = validationResult.message;
                }

            },
            { fireImmediately:true }
        );

        this.updatePageTitleReaction = reaction(
            () => patientViewPageStore.pageTitle,
            (title:string) => ((window as any).document.title = title),
            { fireImmediately:true }
        )

    }

    public componentDidMount() {

        this.exposeComponentRenderersToParentScript();

    }

    public componentWillUnmount(){

        //dispose reaction
        this.updatePageTitleReaction();

    }

    // this gives the parent (legacy) cbioportal code control to mount
    // these components whenever and wherever it wants
    exposeComponentRenderersToParentScript() {

        // exposeComponentRenderer('renderClinicalInformationContainer', ClinicalInformationContainer,
        //     { store:this.props.store }
        // );
        //
        // exposeComponentRenderer('renderGenomicOverview', GenomicOverview);

    }

    public handleSampleClick(id: string, e: React.MouseEvent<HTMLAnchorElement>) {
        if (!e.shiftKey && !e.altKey && !e.metaKey) {
            e.preventDefault();
            this.props.routing.updateRoute({ caseId:undefined, sampleId:id });
        }
        // otherwise do nothing, we want default behavior of link
        // namely that href will open in a new window/tab
    }

    private handleTabChange(id: string) {

        this.props.routing.updateRoute({ tab: id });

    }

    private handlePatientClick(id: string) {

        let values = id.split(":");
        if(values.length == 2){
            this.props.routing.updateRoute({ studyId: values[0], caseId: values[1], sampleId: undefined });
        } else {
            this.props.routing.updateRoute({ caseId: id, sampleId: undefined });
        }

    }

    @computed get cnaTableStatus() {
        if (patientViewPageStore.molecularProfileIdDiscrete.isComplete) {
            if (patientViewPageStore.molecularProfileIdDiscrete.result === undefined) {
                return "unavailable";
            } else if (patientViewPageStore.discreteCNAData.isComplete) {
                return "available";
            } else {
                return "loading";
            }
        } else {
            return "loading";
        }
    }

    private shouldShowPathologyReport(patientViewPageStore: PatientViewPageStore): boolean {
        return patientViewPageStore.pathologyReport.isComplete && patientViewPageStore.pathologyReport.result.length > 0;
    }

    // https://www.npmjs.com/package/react-d3-tree
    private transformDataToCustom(data: PhylogeneticTreeData | undefined) {
        // Early exit
        if (data === null || data === undefined || typeof data.patient === "undefined" || data.patient === null || data.patient.data === null) {
            return "";
        }

        let treeObject: any[] = [];
        const realData: PhylogeneticTree[] = data.patient.data;

        // Create an ancestor map
        const ancestorMap = new Map<string, PhylogeneticTree[]>();
        for (const item of realData) {
            if (ancestorMap.has(item.ancestorClone)) {
                const relations: PhylogeneticTree[] | undefined = ancestorMap.get(item.ancestorClone);
                if (relations !== undefined) {
                    relations.push(item);
                    ancestorMap.set(item.ancestorClone, relations);
                    continue;
                }
            }

            const newArray: PhylogeneticTree[] = [];
            newArray.push(item);
            ancestorMap.set(item.ancestorClone, newArray);
        }

        // Find our root object
        let identifiedItem = null;
        let ancestorId: string;
        for (const interrogatedItem of realData) {
            ancestorId = interrogatedItem.ancestorClone;

            // Find if something exists with this as decendant
            let check = false;
            for (const comparisonItem of realData) {
                if (comparisonItem.descendantClone === ancestorId) {
                    check = true;
                    break;
                }
            }

            // Handle whether this interrogated item has an ancestor
            if (!check) {
                if (identifiedItem !== null && interrogatedItem.ancestorClone !== identifiedItem) {
                    return [{name: "Poorly Defined Tree"}];
                }

                identifiedItem = interrogatedItem.ancestorClone;
            }
        }

        if (identifiedItem === null) {
            return "";
        }

        // Build our object
        treeObject = this.walkTreeAsObject(ancestorMap, identifiedItem, treeObject);
        return treeObject;
        // return "((raccoon:19.19959,bear:6.80041):0.84600,((sea_lion:11.99700, seal:12.00300):7.52973,((monkey:100.85930,cat:47.14069):20.59201, weasel:18.87953):2.09460):3.87382,dog:25.46154);";


        // const myTreeData = [
        //     {
        //         name: 'Top Level',
        //         attributes: {
        //             keyA: 'val A',
        //             keyB: 'val B',
        //             keyC: 'val C',
        //         },
        //         children: [
        //             {
        //                 name: 'Level 2: A',
        //                 attributes: {
        //                     keyA: 'val A',
        //                     keyB: 'val B',
        //                     keyC: 'val C',
        //                 },
        //             },
        //             {
        //                 name: 'Level 2: B',
        //             },
        //         ],
        //     },
        // ];
        //
        // return myTreeData;
    }

    private walkTreeAsObject(ancestorMap: Map<string, PhylogeneticTree[]>, currentParent: string, treeObject: any[]) {
        const size = 20;

        // Add current node data
        const node:any = {
            name: currentParent,
            data: "blah",
            nodeSvgShape: {
                shapeProps: {
                    fill: nodeColours[currentParent] || 'white',
                    r: 10,
                }
            }
        };

        if (ancestorMap.has(currentParent)) {
            const children: PhylogeneticTree[] | undefined = ancestorMap.get(currentParent);
            if (children !== undefined && children.length > 0) {
                let childArray: any[] = [];
                for (let i = 0; i < children.length; i++) {
                    childArray = this.walkTreeAsObject(ancestorMap, children[i].descendantClone, childArray);
                }
                node.children = childArray;
            }
        }

        treeObject.push(node);
        return treeObject;
    }

    private transformDataToNewick(data: PhylogeneticTreeData): string {

        // Early exit
        if (data === null || typeof data.patient === "undefined" || data.patient === null || data.patient.data === null) {
            return "";
        }

        let newick: string = "";
        const realData: PhylogeneticTree[] = data.patient.data;

        // Create an ancestor map
        const ancestorMap = new Map<string, PhylogeneticTree[]>();
        for (const item of realData) {
            if (ancestorMap.has(item.ancestorClone)) {
                const relations: PhylogeneticTree[] | undefined = ancestorMap.get(item.ancestorClone);
                if (relations !== undefined) {
                    relations.push(item);
                    ancestorMap.set(item.ancestorClone, relations);
                    continue;
                }
            }


            const newArray: PhylogeneticTree[] = [];
            newArray.push(item);
            ancestorMap.set(item.ancestorClone, newArray);
        }

        // Find our root object
        let identifiedItem = null;
        let ancestorId: string;
        for (const interrogatedItem of realData) {
            ancestorId = interrogatedItem.ancestorClone;

            // Find if something exists with this as decendant
            let check = false;
            for (const comparisonItem of realData) {
                if (comparisonItem.descendantClone === ancestorId) {
                    check = true;
                    break;
                }
            }

            // Handle whether this interrogated item has an ancestor
            if (!check) {
                if (identifiedItem !== null && interrogatedItem.ancestorClone !== identifiedItem) {
                    return "(((((identified)roots)multiple)data)generated)Poorly";
                }

                identifiedItem = interrogatedItem.ancestorClone;
            }
        }

        if (identifiedItem === null) {
            return "";
        }

        // Build our string
        newick = this.walkTree(ancestorMap, identifiedItem, newick);
        newick = newick.split('').reverse().join('')+ ";";
        return newick;
        // return "((raccoon:19.19959,bear:6.80041):0.84600,((sea_lion:11.99700, seal:12.00300):7.52973,((monkey:100.85930,cat:47.14069):20.59201, weasel:18.87953):2.09460):3.87382,dog:25.46154);";
    }

    private walkTree(ancestorMap: Map<string, PhylogeneticTree[]>, currentParent: string, newick: string) : string {
        newick += "0.1:" + currentParent; // reversed distance declaration for string reversal
        if (!ancestorMap.has(currentParent)) {
            return newick;
        }

        newick += ")"; // note parenthesis are invertes so when we reverse the string later they become correct
        const children: PhylogeneticTree[] | undefined = ancestorMap.get(currentParent);
        if (children === undefined) {
            return newick;
        }

        for (let i = 0; i < children.length; i++) {
            newick = this.walkTree(ancestorMap, children[i].descendantClone, newick);
            if (i !== children.length - 1) {
                newick += ",";
            }
        }
        newick += "("; // note parenthesis are invertes so when we reverse the string later they become correct

        return newick;
    }

    public render() {

        let sampleManager: SampleManager | null = null;
        let sampleHeader: (JSX.Element | undefined)[] | null = null;
        let cohortNav: JSX.Element | null = null;
        let studyName: JSX.Element | null = null;

        if (patientViewPageStore.urlValidationError) {
            return <ValidationAlert urlValidationError={patientViewPageStore.urlValidationError} />;
        }

        if (patientViewPageStore.studyMetaData.isComplete) {
            let study = patientViewPageStore.studyMetaData.result;
            studyName = <a href={`study?id=${study.studyId}`} className="studyMetaBar_studyName">{study.name}</a>;
        }

        if (patientViewPageStore.patientViewData.isComplete && patientViewPageStore.studyMetaData.isComplete) {
            let patientData = patientViewPageStore.patientViewData.result;
            if (patientViewPageStore.clinicalEvents.isComplete && patientViewPageStore.clinicalEvents.result.length > 0) {
                sampleManager = new SampleManager(patientData.samples!, patientViewPageStore.clinicalEvents.result);
            } else {
                sampleManager = new SampleManager(patientData.samples!);
            }

            sampleHeader = _.map(sampleManager!.samples, (sample: ClinicalDataBySampleId) => {
                const isPDX:boolean = (sampleManager &&
                    sampleManager.clinicalDataLegacyCleanAndDerived &&
                    sampleManager.clinicalDataLegacyCleanAndDerived[sample.id] &&
                    sampleManager.clinicalDataLegacyCleanAndDerived[sample.id].DERIVED_NORMALIZED_CASE_TYPE === 'Xenograft'
                );
                return (
                    <div className="patientSample">
                        <span className='clinical-spans'>
                            {
                                sampleManager!.getComponentForSample(sample.id, 1, '',
                                    <span style={{display:'inline-flex'}}>
                                        {'\u00A0'}
                                        {isPDX && getMouseIcon()}
                                        {isPDX && '\u00A0'}
                                        <a
                                            href={`case.do?#/patient?sampleId=${sample.id}&studyId=${patientViewPageStore.studyMetaData.result!.studyId}`}
                                            target="_blank"
                                            onClick={(e: React.MouseEvent<HTMLAnchorElement>) => this.handleSampleClick(sample.id, e)}
                                        >
                                            {sample.id}
                                        </a>
                                        {sampleManager &&
                                         sampleManager.clinicalDataLegacyCleanAndDerived[sample.id] &&
                                         getSpanElementsFromCleanData(sampleManager.clinicalDataLegacyCleanAndDerived[sample.id], 'lgg_ucsf_2014')}
                                    </span>
                                )
                            }
                        </span>
                    </div>
                );
            });

            if (sampleHeader && sampleHeader.length > 0 && patientViewPageStore.pageMode === 'sample' && patientViewPageStore.patientId) {
                sampleHeader.push(
                    <button className="btn btn-default btn-xs" onClick={()=>this.handlePatientClick(patientViewPageStore.patientId)}>Show all samples</button>
                );
            }
        }

        if (patientViewPageStore.patientIdsInCohort && patientViewPageStore.patientIdsInCohort.length > 0) {
            const indexInCohort = patientViewPageStore.patientIdsInCohort.indexOf(patientViewPageStore.studyId + ':' + patientViewPageStore.patientId);
            cohortNav = (
                <PaginationControls
                    currentPage={indexInCohort + 1}
                    showMoreButton={false}
                    showItemsPerPageSelector={false}
                    showFirstPage={true}
                    showLastPage={true}
                    textBetweenButtons={` of ${patientViewPageStore.patientIdsInCohort.length} patients`}
                    firstPageDisabled={indexInCohort === 0}
                    previousPageDisabled={indexInCohort === 0}
                    nextPageDisabled={indexInCohort === patientViewPageStore.patientIdsInCohort.length-1}
                    lastPageDisabled={indexInCohort === patientViewPageStore.patientIdsInCohort.length-1}
                    onFirstPageClick={() => this.handlePatientClick(patientViewPageStore.patientIdsInCohort[0]) }
                    onPreviousPageClick={() => this.handlePatientClick(patientViewPageStore.patientIdsInCohort[indexInCohort-1]) }
                    onNextPageClick={() => this.handlePatientClick(patientViewPageStore.patientIdsInCohort[indexInCohort+1]) }
                    onLastPageClick={() => this.handlePatientClick(patientViewPageStore.patientIdsInCohort[patientViewPageStore.patientIdsInCohort.length-1]) }
                    onChangeCurrentPage={(newPage) => {
                        if (newPage > 0 && newPage <= patientViewPageStore.patientIdsInCohort.length) {
                            this.handlePatientClick(patientViewPageStore.patientIdsInCohort[newPage - 1]);
                        }
                    }}
                    pageNumberEditable={true}
                    className="cohortNav"
                />
            );
        }

        return (
            <div className="patientViewPage">

                <AjaxErrorModal
                    show={(patientViewPageStore.ajaxErrors.length > 0)}
                    onHide={()=>{ patientViewPageStore.clearErrors() }}
                    title={`Can't find ${patientViewPageStore.pageMode} ${patientViewPageStore.caseId} in study ${patientViewPageStore.studyId}.`}
                    troubleshooting={["Check that your URL parameters are valid.", "Try refreshing the page.", "Make sure you are connected to the internet."]}
                />

                <div className="topBanner">

                {  (patientViewPageStore.patientViewData.isComplete) && (
                    <div className="patientPageHeader">
                        <i className="fa fa-user-circle-o patientIcon" aria-hidden="true"></i>
                        <div className="patientDataTable">
                        <table>
                            <tr>
                                <td>Patient:</td>
                                <td><PatientHeader
                                    handlePatientClick={(id: string)=>this.handlePatientClick(id)}
                                    patient={patientViewPageStore.patientViewData.result.patient}
                                    darwinUrl={patientViewPageStore.darwinUrl.result}
                                    sampleManager={sampleManager}/></td>
                            </tr>
                            <tr>
                                <td>Samples:</td>
                                <td>
                                    <div className="patientSamples">{sampleHeader}</div>
                                </td>
                            </tr>
                        </table>
                        </div>
                        <div className="studyMetaBar">{ studyName } <If condition={(cohortNav != null)}>{cohortNav}</If></div>
                    </div>
                )
                }
                </div>
                <If condition={patientViewPageStore.patientViewData.isComplete}>
                <Then>
                <MSKTabs id="patientViewPageTabs" activeTabId={this.props.routing.location.query.tab}  onTabClick={(id:string)=>this.handleTabChange(id)} className="mainTabs">

                        <MSKTab key={0} id="summaryTab" linkText="Summary">

                            <LoadingIndicator isLoading={patientViewPageStore.clinicalEvents.isPending} />

                            {
                                (!!sampleManager && patientViewPageStore.clinicalEvents.isComplete && patientViewPageStore.clinicalEvents.result.length > 0) && (

                                    <div>
                                        <Timeline store={patientViewPageStore} getWidth={ ()=>$(window).width()-40 } sampleManager={ sampleManager } />
                                        <hr />
                                    </div>
                                )

                            }

                            <LoadingIndicator
                                    isLoading={patientViewPageStore.mutationData.isPending || patientViewPageStore.cnaSegments.isPending}
                            />

                            {
                                (patientViewPageStore.mutationData.isComplete && patientViewPageStore.cnaSegments.isComplete
                                && patientViewPageStore.sequencedSampleIdsInStudy.isComplete && sampleManager)
                                && ( patientViewPageStore.mutationData.result.length > 0 || patientViewPageStore.cnaSegments.result.length > 0)
                                && (
                                    <div>
                                        <GenomicOverview
                                            mergedMutations={patientViewPageStore.mergedMutationData}
                                            samples={patientViewPageStore.samples.result}
                                            cnaSegments={patientViewPageStore.cnaSegments.result}
                                            sampleOrder={sampleManager.sampleIndex}
                                            sampleLabels={sampleManager.sampleLabels}
                                            sampleColors={sampleManager.sampleColors}
                                            sampleManager={sampleManager}
                                            getContainerWidth={()=>$(window).width()}
                                        />
                                        <hr />
                                    </div>
                                )
                            }

                            <LoadingIndicator isLoading={patientViewPageStore.mutationData.isPending || patientViewPageStore.uncalledMutationData.isPending || patientViewPageStore.oncoKbAnnotatedGenes.isPending} />

                            {
                                (patientViewPageStore.oncoKbAnnotatedGenes.isComplete && patientViewPageStore.mutationData.isComplete && patientViewPageStore.uncalledMutationData.isComplete && !!sampleManager) && (
                                    <PatientViewMutationTable
                                        sampleManager={sampleManager}
                                        sampleIds={sampleManager ? sampleManager.getSampleIdsInOrder() : []}
                                        uniqueSampleKeyToTumorType={patientViewPageStore.uniqueSampleKeyToTumorType}
                                        molecularProfileIdToMolecularProfile={patientViewPageStore.molecularProfileIdToMolecularProfile.result}
                                        variantCountCache={patientViewPageStore.variantCountCache}
                                        genomeNexusEnrichmentCache={patientViewPageStore.genomeNexusEnrichmentCache}
                                        discreteCNACache={patientViewPageStore.discreteCNACache}
                                        mrnaExprRankCache={patientViewPageStore.mrnaExprRankCache}
                                        oncoKbEvidenceCache={patientViewPageStore.oncoKbEvidenceCache}
                                        pubMedCache={patientViewPageStore.pubMedCache}
                                        mrnaExprRankMolecularProfileId={patientViewPageStore.mrnaRankMolecularProfileId.result || undefined}
                                        discreteCNAMolecularProfileId={patientViewPageStore.molecularProfileIdDiscrete.result}
                                        data={patientViewPageStore.mergedMutationDataIncludingUncalled}
                                        downloadDataFetcher={patientViewPageStore.downloadDataFetcher}
                                        mutSigData={patientViewPageStore.mutSigData.result}
                                        myCancerGenomeData={patientViewPageStore.myCancerGenomeData}
                                        hotspotData={patientViewPageStore.indexedHotspotData}
                                        cosmicData={patientViewPageStore.cosmicData.result}
                                        oncoKbData={patientViewPageStore.oncoKbData}
                                        oncoKbAnnotatedGenes={patientViewPageStore.oncoKbAnnotatedGenes.result}
                                        civicGenes={patientViewPageStore.civicGenes}
                                        civicVariants={patientViewPageStore.civicVariants}
                                        userEmailAddress={AppConfig.userEmailAddress}
                                        enableOncoKb={AppConfig.showOncoKB}
                                        enableFunctionalImpact={AppConfig.showGenomeNexus}
                                        enableHotspot={AppConfig.showHotspot}
                                        enableMyCancerGenome={AppConfig.showMyCancerGenome}
                                        enableCivic={AppConfig.showCivic}
                                    />
                                )
                            }

                            <hr />

                            <LoadingIndicator isLoading={(this.cnaTableStatus === 'loading')} />

                            <CopyNumberTableWrapper
                                sampleIds={sampleManager ? sampleManager.getSampleIdsInOrder() : []}
                                sampleManager={sampleManager}
                                cnaOncoKbData={patientViewPageStore.cnaOncoKbData}
                                cnaCivicGenes={patientViewPageStore.cnaCivicGenes}
                                cnaCivicVariants={patientViewPageStore.cnaCivicVariants}
                                oncoKbEvidenceCache={patientViewPageStore.oncoKbEvidenceCache}
                                oncoKbAnnotatedGenes={patientViewPageStore.oncoKbAnnotatedGenes.result}
                                enableOncoKb={AppConfig.showOncoKB}
                                enableCivic={AppConfig.showCivic}
                                userEmailAddress={AppConfig.userEmailAddress}
                                pubMedCache={patientViewPageStore.pubMedCache}
                                data={patientViewPageStore.mergedDiscreteCNAData}
                                copyNumberCountCache={patientViewPageStore.copyNumberCountCache}
                                mrnaExprRankCache={patientViewPageStore.mrnaExprRankCache}
                                gisticData={patientViewPageStore.gisticData.result}
                                mrnaExprRankMolecularProfileId={patientViewPageStore.mrnaRankMolecularProfileId.result || undefined}
                                status={this.cnaTableStatus}
                            />
                        </MSKTab>

                        {(patientViewPageStore.pageMode === 'patient') && (
                        <MSKTab key={2} id="clinicalDataTab" linkText="Clinical Data">

                                    <div className="clearfix">
                                        <FeatureTitle title="Patient"
                                                      isLoading={ patientViewPageStore.clinicalDataPatient.isPending }
                                                      className="pull-left"/>
                                        { (patientViewPageStore.clinicalDataPatient.isComplete) && (
                                            <ClinicalInformationPatientTable showTitleBar={true}
                                                                             data={patientViewPageStore.clinicalDataPatient.result}/>

                                        )
                                        }
                                    </div>

                            <br />

                            <div className="clearfix">
                                <FeatureTitle title="Samples" isLoading={ patientViewPageStore.clinicalDataGroupedBySample.isPending } className="pull-left" />
                                {  (patientViewPageStore.clinicalDataGroupedBySample.isComplete) && (
                                    <ClinicalInformationSamples
                                        samples={patientViewPageStore.clinicalDataGroupedBySample.result!}/>
                                )
                                }
                            </div>


                        </MSKTab>
                    )}


                    <MSKTab key={3} id="pathologyReportTab" linkText="Pathology Report"
                            hide={!this.shouldShowPathologyReport(patientViewPageStore)}
                            loading={patientViewPageStore.pathologyReport.isPending}
                    >
                        <div>
                            <PathologyReport iframeStyle={{position:"absolute", top:0}} pdfs={patientViewPageStore.pathologyReport.result} />
                        </div>
                    </MSKTab>

                    <MSKTab key={4} id="heatMapReportTab" linkText="Heatmap"
                             hide={(patientViewPageStore.MDAndersonHeatMapAvailable.isComplete && !patientViewPageStore.MDAndersonHeatMapAvailable.result)}
                            loading={patientViewPageStore.MDAndersonHeatMapAvailable.isPending}
                    >
                            <IFrameLoader height={700} url={ `//bioinformatics.mdanderson.org/TCGA/NGCHMPortal/?participant=${patientViewPageStore.patientId}` } />
                    </MSKTab>

                    <MSKTab key={5} id="tissueImageTab" linkText="Tissue Image"
                            hide={/https/.test(window.location.protocol) // can't show this iframe if we're on https:
                                    || (patientViewPageStore.hasTissueImageIFrameUrl.isComplete && !patientViewPageStore.hasTissueImageIFrameUrl.result)}
                            loading={patientViewPageStore.hasTissueImageIFrameUrl.isPending}
                    >
                        <div style={{position: "relative"}}>
                            <IFrameLoader height={700} url={  `http://cancer.digitalslidearchive.net/index_mskcc.php?slide_name=${patientViewPageStore.patientId}` } />
                        </div>
                    </MSKTab>

                    <MSKTab key={6} id="phylogeneticTreeReportTab" linkText="Phylogenetic Tree"
                            hide={(!patientViewPageStore.phylogeneticTreeData.isComplete || !patientViewPageStore.oncoKbAnnotatedGenes.isComplete || !patientViewPageStore.mutationData.isComplete || !patientViewPageStore.uncalledMutationData.isComplete)}
                            loading={patientViewPageStore.phylogeneticTreeData.isPending || patientViewPageStore.mutationData.isPending || patientViewPageStore.uncalledMutationData.isPending || patientViewPageStore.oncoKbAnnotatedGenes.isPending}>
                        {/*<Phylocanvas className="Phylogenetic Tree" data={this.transformDataToNewick(patientViewPageStore.phylogeneticTreeData.result)} treeType={"diagonal"} />*/}
                        <PhylogeneticTreeComponent data={this.transformDataToCustom(patientViewPageStore.phylogeneticTreeData.result)} tooltips={false} />
                    </MSKTab>

                    </MSKTabs>

                    </Then>
                    <Else>
                        <ThreeBounce size={20} className="center-block text-center" />
                    </Else>

                </If>

            </div>
        );
    }
}
