import { doesMessageMatchSubscription } from './doesMessageMatchSubscription';
describe('doesMessageMatchSubscription', () => {
  it('Should return true if a message matches', () => {
    expect(
      doesMessageMatchSubscription(
        { sender: 'test1', type: 'hello' },
        { sender: 'test1', type: 'hello', body: {} }
      )
    ).toBeTruthy();

    expect(
      doesMessageMatchSubscription(
        { type: 'hello' },
        { sender: 'test1', type: 'hello', body: {} }
      )
    ).toBeTruthy();

    expect(
      doesMessageMatchSubscription(
        { sender: 'test1' },
        { sender: 'test1', type: 'hello', body: {} }
      )
    ).toBeTruthy();

    expect(
      doesMessageMatchSubscription(
        {},
        { sender: 'test1', type: 'hello', body: {} }
      )
    ).toBeTruthy();
  });

  it('Should return false if a message doesnt match', () => {
    expect(
      doesMessageMatchSubscription(
        { sender: 'test2', type: 'hello' },
        { sender: 'test1', type: 'hello', body: {} }
      )
    ).toBeFalsy();

    expect(
      doesMessageMatchSubscription(
        { sender: 'test1', type: 'hello2' },
        { sender: 'test1', type: 'hello', body: {} }
      )
    ).toBeFalsy();
  });
});
