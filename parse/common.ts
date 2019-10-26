import { isIdentifier, isMemberExpression, MemberExpression } from '@babel/types';


export type getValuesOptions = {
    root?: string,
    validRootObjects?: string[],
    prependRoot?: boolean
}

export type getValuesResult = { 
    path: string, 
    rootObj: string 
};
export function getValueOfMemberExpression(propVal: MemberExpression, { root, validRootObjects, prependRoot = true  }: getValuesOptions): getValuesResult {
    if (isIdentifier(propVal.object) && isIdentifier(propVal.property)) {
        root = root || propVal.object.name;
        
        return {
            path: `${!prependRoot ? '':`${root}.` }${propVal.property.name}`,
            rootObj: propVal.object.name
        };
    }
    else if (isMemberExpression(propVal.object) && isIdentifier(propVal.property)) {
        const tmp = getValueOfMemberExpression(propVal.object, { root, validRootObjects, prependRoot: prependRoot });
        return {
            rootObj: tmp.rootObj,
            path: `${tmp.path}.${propVal.property.name}`
        };
    }
    throw new Error('expected identifier');
}
