/* @flow */
import Publisher                    from './Publisher';
import type { UnsubscribeFunction } from './Publisher';


export type ActionFunctor< Fn > = $All< Fn, {
    _isActionFunctor    : boolean;
    action              : $Subtype< Action< Fn > >;
    listen              : ( callback: ( x: any ) => ?Promise< * > ) => UnsubscribeFunction;
    listenOnce          : ( callback: ( x: any ) => ?Promise< * > ) => UnsubscribeFunction;
} >;

type Children = { [key: string]: Action< any > };






/**
 * @abstract
 */
export default class Action< Fn > extends Publisher {
    children    : Children;

    constructor() {
        super();
        this.children = {};
    }


    /**
     * Creates children actions
     */
    withChildren( children: Array< Children | string > ) : Action< Fn > {
        children.forEach( ( child ) => {
            if( typeof child === 'string' ) {
                let action = new Action();
                this.children[ child ] = action;
                Object.defineProperty( this, child, { value: action } );
            }
            else if( Array.isArray( child ) && typeof child[0] === 'string' && child[1] instanceof Action ) {
                let name = child[ 0 ];
                this.children[ name ] = child[ 1 ];
                Object.defineProperty( this, name, { value: child[ 1 ] } );
            }
        });
        return this;
    }


    /**
    * Returns a function to trigger the action, async or sync depending on the action definition.
     */
    get asFunction() : $Shape< ActionFunctor< Fn > > {
        return this.createFunctor();
    }


    /**
     *
     */
    createFunctor() : $Shape< ActionFunctor< Fn > > {
        var functor = ( ...args: Array< * > ) => this.trigger( ...args );

        Object.defineProperty( functor, '_isActionFunctor', { value: true } );
        Object.defineProperty( functor, 'action', { value: this } );
        Object.defineProperty( functor, 'listen', { value: ( fn, bindCtx ) => {
            return Action.prototype.listen.call( this, fn, bindCtx );
        } } );
        Object.defineProperty( functor, 'listenOnce', { value: ( fn, bindCtx ) => {
            return Action.prototype.listenOnce.call( this, fn, bindCtx );
        } } );

        Object.keys( this.children ).forEach( ( childName ) => {
            Object.defineProperty( functor, childName, { value: this.children[ childName ].asFunction } );
        });

        return functor;
    }

    get eventLabel() : string { return 'event'; }
    get isAction()  : boolean { return true; }
}
