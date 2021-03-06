/* @flow */
import * as _ from './utils';
import invariant from 'invariant';

export type UnsubscribeFunction = () => void;



/**
 * Base class of everything.
 * - actions are a directly subclass
 * - stores are inheriting from Listener
 */
export default class Publisher {
    emitter            : any;

    /**
     * @protected
     */
    constructor() {
        this.emitter = new _.EventEmitter();
    }

    get eventLabel() : string { return 'event'; }
    get isPublisher() : boolean { return true; }


    /**
     * Hook used by the publisher that is invoked before emitting
     * and before `shouldEmit`. The arguments are the ones that the action
     * is invoked with. If this function returns something other than
     * undefined, that will be passed on as arguments for shouldEmit and
     * emission.
     */
    preEmit( args: any ) : ?Object {}

    /**
     * Hook used by the publisher after `preEmit` to determine if the
     * event should be emitted with given arguments. This may be overridden
     * in your application, default implementation always returns true.
     *
     * @returns {Boolean} true if event should be emitted
     */
    shouldEmit() : boolean { return true; }

    /**
     * @abstract
     */
    processResult( result: ?Promise< * > ) {}

    /**
     * Subscribes the given callback for action triggered
     *
     * @param {( x: any ) => ?any} callback The callback to register as event handler
     * @returns {UnsubscribeFunction} Callback that unsubscribes the registered event handler
     */
    listen( callback: ( x: any ) => ?any ) : UnsubscribeFunction {
        invariant( typeof callback === 'function', 'listen has to be given a valid callback function' );

        var aborted = false;

        var eventHandler = ( args ) => {
            if( aborted ) return;
            this.processResult( callback.apply( this, args ) );
        };

        this.emitter.addListener( this.eventLabel, eventHandler );

        return () => {
            aborted = true;
            this.emitter.removeListener( this.eventLabel, eventHandler );
        };
    }


    listenOnce( callback: ( x: any ) => ?any ) : UnsubscribeFunction {
        invariant( typeof callback === 'function', 'listenOnce has to be given a valid callback function' );

        var unsubscribe = this.listen( ( ...args: any[] ) => {
            unsubscribe();
            return callback.apply( this, args );
        });
        return unsubscribe;
    }

    /**
     * Publishes an event using `this.emitter` (if `shouldEmit` agrees)
     */
    triggerSync( ...args: any ) {
        var preResult = this.preEmit.apply( this, args );
        if( typeof preResult !== 'undefined' ) {
            args = _.isArguments(preResult) ? preResult : [].concat(preResult);
        }

        if( !this.shouldEmit.apply( this, args ) ) return;

        this.emitter.emit( this.eventLabel, args );
    }

    /**
     * Tries to publish the event on the next tick
     */
    trigger( ...args: any ) {
        _.nextTick( () => this.triggerSync.apply( this, args ) );
    }
}
