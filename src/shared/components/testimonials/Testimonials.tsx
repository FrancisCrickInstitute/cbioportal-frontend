import * as React from 'react';
import CSSTransitionGroup from 'react-transition-group/CSSTransitionGroup';
import {observable, action} from "mobx";
import {observer} from "mobx-react";

import styles from './testimonials.module.scss';

export interface ITestimonial {
    cite: string;
    quote: string;
}

export class TestimonialStore {

    @observable public testimonialIndex: number;
    @observable public testimonials: ITestimonial[];

    @action incrementIndex() {
        this.testimonialIndex = (this.testimonialIndex + 1) % this.testimonials.length;
    }

    constructor() {
        this.testimonialIndex = 0;
        this.testimonials = [
            {
                cite: '',
                quote: ``
            },

        ];
        setInterval(() => this.incrementIndex(), 15000);
    }

}

@observer
export default class Testimonials extends React.Component <{}, {}> {

    private store:TestimonialStore;

    constructor() {
        super();

        this.store = new TestimonialStore();
    }


    public render() {
        const { testimonials, testimonialIndex } = this.store;
        const activeTestimonial = testimonials[testimonialIndex];
        return (
            <div className={styles.testimonial}>
                <CSSTransitionGroup transitionName="test-trans" transitionEnterTimeout={2000} transitionLeaveTimeout={2000}>
                    <div className='testimonial-blockquote' key={testimonialIndex}>
                        <p>"{activeTestimonial.quote}"</p>
                        <cite>--{activeTestimonial.cite}</cite>
                        <div className="testimonial-links">
                            <a href="what_people_are_saying.jsp" >View All</a>
                        </div>
                    </div>
                </CSSTransitionGroup>
            </div>
        );
    }
}
