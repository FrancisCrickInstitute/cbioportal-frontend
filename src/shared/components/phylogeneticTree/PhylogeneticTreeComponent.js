import React from 'react';
import PropTypes from 'prop-types';
import Tree from 'react-d3-tree';
import * as d3 from 'd3';
import './tooltiptester.css';

/** @augments {React.Component<object, object>} */
export default class PhylogeneticTreeComponent extends React.Component {
    state = {
        translate: {
            x: 0,
            y: 0
        }
    };

    componentDidMount() {
        const dimensions = this.treeContainer.getBoundingClientRect();
        this.setState({
            translate: {
                x: dimensions.width / 2,
                y: dimensions.height / 2
            }
        });
    }

    render() {
        return (

            <div className="treeWrapper" style={{ height: '50em' }} ref={(ref) => { this.treeContainer = ref; }}>

                <div className="tooltipster" />

                <Tree
                  data={this.props.data}
                  translate={this.state.translate}
                  orientation={'invertical'}
                  collapsible={false}
                  onMouseOver={
                        function (node, evt) {
                            if (!this.props.tooltips) {
                                return;
                            }

                            const tooltip = d3.select('div.tooltipster');
                            tooltip.transition().duration(300).style('opacity', 1);

                            // Positioning
                            tooltip.style('left', `${Math.max(0, evt.pageX)}px`).style('top', `${evt.pageY}px`);

                            // Content
                            tooltip.html(`<b>Info about: ${node.data}</b>`);

                            // if (!tooltip.classed("visitip")) {
                            //     tooltip.classed("visitip", true);
                            // }
                        }
                    }
                  onMouseOut={
                        function (node, evt) {
                            if (!this.props.tooltips) {
                                return;
                            }

                            const tooltip = d3.select('div.tooltipster');
                            // tooltip.classed("visitip", false);
                            tooltip.transition().duration(300).style('opacity', 1e-6);
                        }
                    }
                />

            </div>
        );
    }
}

PhylogeneticTreeComponent.propTypes = {
    data: PropTypes.string,
    tooltips: PropTypes.bool,
};

PhylogeneticTreeComponent.defaultProps = {
    data: '',
    tooltips: false,
};
