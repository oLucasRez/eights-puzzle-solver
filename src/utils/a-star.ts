// -------------------------------------------------------------------< classes
import { Dict } from '../classes';
// ---------------------------------------------------------------------< utils
import { equals, has } from '../utils';
// -----------------------------------------------------------------< constants
import { infinity } from '../constants';
import { Heap } from '../classes/heap';
// ============================================================================
function buildPath<NodeType>(
  cameFrom: Dict<NodeType, NodeType>,
  current: NodeType | null
): NodeType[] {
  if (!current) return [];

  const path = [current];

  let count = 0;
  while (current && cameFrom.get(current, null)) {
    if (count++ > 750) throw new Error('Timeout');

    current = cameFrom.get(current, null);

    current && path.unshift(current);
  }

  path.shift();

  return path.filter((value) => value !== null);
}

type MaybePromise<Type> = Type | Promise<Type>;

type Neighbors<NodeType> = (node: NodeType) => MaybePromise<NodeType[]>;
type HeuristicCost<NodeType> = (
  current: NodeType,
  goal: NodeType
) => MaybePromise<number>;
type EdgeWeight<NodeType> = (
  from: NodeType,
  to: NodeType
) => MaybePromise<number>;

const defaultCost = () => 1;

export async function aStar<NodeType>(
  start: NodeType,
  goal: NodeType,
  neighbors: Neighbors<NodeType>,
  heuristicCost: HeuristicCost<NodeType> = defaultCost,
  edgeWeight: EdgeWeight<NodeType> = defaultCost
): Promise<NodeType[]> {
  const cameFrom: Dict<NodeType, NodeType> = new Dict<NodeType, NodeType>();

  const startCost: Dict<NodeType, number> = new Dict<NodeType, number>();
  startCost.set(start, 0);

  const fullCost: Dict<NodeType, number> = new Dict<NodeType, number>();
  fullCost.set(start, await heuristicCost(start, goal));

  let openSet = new Heap<NodeType>(
    (me, over) => fullCost.get(me, infinity) < fullCost.get(over, infinity)
  );
  openSet.push(start);

  let count = 0;
  while (openSet.array.length) {
    if (count++ > 3000) throw new Error('Timeout');

    const current = openSet.pop();

    if (!current) throw new Error('Nó impossível de alcançar.');
    if (equals(current, goal)) return buildPath(cameFrom, current);

    for (const neighbor of await neighbors(current)) {
      const neighborStartCost =
        startCost.get(current, infinity) +
        (await edgeWeight(current, neighbor));

      if (
        startCost.get(neighbor, infinity) === infinity ||
        neighborStartCost < startCost.get(neighbor, infinity)
      ) {
        cameFrom.set(neighbor, current);
        startCost.set(neighbor, neighborStartCost);
        fullCost.set(
          neighbor,
          neighborStartCost + (await heuristicCost(neighbor, goal))
        );

        !has(openSet.array, neighbor) && openSet.push(neighbor);
      }
    }
  }

  throw new Error('Nó impossível de alcançar.');
}
