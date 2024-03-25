import logo from './logo.svg';
import './App.css';
import React, {useEffect, useReducer} from 'react';
import { API } from 'aws-amplify';
import { List } from 'antd';
import 'antd/dist/antd.css';
import { listNotes } from './graphql/queries';

const initialState = {
    notes: [],
    loading: true,
    error: false,
    form: { name: '', description: '' }
}

function reducer(state, action) {
    switch(action.type) {
        case 'SET_NOTES':
          return { ...state, notes: action.notes, loading: false };
        case 'ERROR':
          return { ...state, loading: false, error: true };
        default:
          return { ...state};
    }
};


const App = () => {
  const [state, dispatch] = useReducer(reducer, initialState);

  const client = generateClient();

  const fetchNotes = async() => {
      try {
        const notesData = await client.graphql({
          query: listNotes
        });
        dispatch({ type: 'SET_NOTES', notes: notesData.data.listNotes.items });
      } catch (err) {
        console.error(err);
        dispatch({ type: 'ERROR' });
      }
    };

    useEffect(() => {
      fetchNotes();
      const subscription = client.graphql({
        query: onCreateNote
      })
        .subscribe({
          next: noteData => {
            console.log(noteData) // added for troublshooting
            const note = noteData.data.onCreateNote //"value" no longer needed
            if (CLIENT_ID === note.clientId) return
            dispatch({ type: 'ADD_NOTE', note })
          }
        })
        return () => subscription.unsubscribe();
    }, []);

    const styles = {
        container: { padding: 20 },
        input: { marginBottom: 10 },
        item: { textAlign: 'left' },
        p: { color: '#1890ff' }
    }

    function renderItem(item) {
      return (
          <List.Item 
              style={styles.item}
              actions={[
                  <p style={styles.p} onClick={() => deleteNote(item)}>Delete</p>,
                  <p style={styles.p} onClick={() => updateNote(item)}>
                      {item.completed ? 'completed' : 'mark completed'}
                  </p>
                ]}>
          <List.Item.Meta
              title={item.name}
              description={item.description}
          />
          </List.Item>
      )
    }; 

  
  return (
    <div style={styles.container}>
            <Input
                onChange={onChange}
                value={state.form.name}
                placeholder="Note Name"
                name='name'
                style={styles.input}
            />
            <Input
                onChange={onChange}
                value={state.form.description}
                placeholder="Note description"
                name='description'
                style={styles.input}
            />
            <Button
                onClick={createNote}
                type="primary"
            >Create Note</Button>    
            <List
                loading={state.loading}
                dataSource={state.notes}
                renderItem={renderItem}
            />
      </div>
  );
}

export default App;
