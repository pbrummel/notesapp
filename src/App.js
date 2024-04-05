import './App.css';
import React, {useEffect, useReducer, useState} from 'react';
// V6: https://docs.amplify.aws/react/build-a-backend/graphqlapi/set-up-graphql-api/#add-your-first-record
import { generateClient } from 'aws-amplify/api';
import { List, Input, Button } from 'antd';
import 'antd/dist/reset.css';
import { v4 as uuid } from 'uuid';
import { listNotes } from './graphql/queries';
import { onCreateNote } from './graphql/subscriptions';
import { 
    createNote as CreateNote,
    deleteNote as DeleteNote, 
    updateNote as UpdateNote
} from './graphql/mutations';
import 'antd/dist/reset.css';

const CLIENT_ID = uuid();

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
        case 'ADD_NOTE':
            return { ...state, notes: [action.note, ...state.notes]}
        case 'RESET_FORM':
            return { ...state, form: initialState.form }
        case 'SET_INPUT':
            return { ...state, form: { ...state.form, [action.name]: action.value }}    
        case 'ERROR':
            return { ...state, loading: false, error: true };
        default:
            return { ...state};
    }
};

const App = () => {
    const [state, dispatch] = useReducer(reducer, initialState);
    const [completedCount, setCompletedCount] = useState(0);

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

const createNote = async () => {
    const { form } = state // destructuring - form element out of state

    if (!form.name || !form.description) {
        return alert('please enter a name and description')
    }

    const note = { ...form, clientId: CLIENT_ID, completed: false, id: uuid() }
    dispatch({ type: 'ADD_NOTE', note });
    dispatch({ type: 'RESET_FORM' });

    try {
        await client.graphql({
        query: CreateNote,
        variables: { input: note }
        })
        console.log('successfully created note!')
    } catch (err) {
        console.error("error: ", err)
    }
};

const deleteNote = async({ id }) => {
    const index = state.notes.findIndex(n => n.id === id)
    const notes = [
      ...state.notes.slice(0, index), // TODO add a filter?
      ...state.notes.slice(index + 1)];
    dispatch({ type: 'SET_NOTES', notes })
    try {
      await client.graphql({
        query: DeleteNote,
        variables: { input: { id } }
      })
      console.log('successfully deleted note!')
      } catch (err) {
        console.error(err)
    }
};

const updateNote = async (note) => {
    const index = state.notes.findIndex(n => n.id === note.id);
    const notes = [...state.notes];
    const updatedCompletedCount = note.completed ? completedCount - 1 : completedCount + 1; // Decrement if completed, increment if not
    setCompletedCount(updatedCompletedCount);
    notes[index].completed = !note.completed;
    dispatch({ type: 'SET_NOTES', notes });
    try {
        await client.graphql({
            query: UpdateNote,
            variables: { input: { id: note.id, completed: notes[index].completed } }
        });
        console.log('note successfully updated!');
    } catch (err) {
        console.error(err);
    }
  };

    
const onChange = (e) => {
    dispatch({ type: 'SET_INPUT', name: e.target.name, value: e.target.value });
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
        container: {padding: 20},
        input: {marginBottom: 10},
        item: { textAlign: 'left' },
        p: { color: '#1890ff' },
        deleteButton: { color: 'white', fontWeight: "bold" }
    }

    function renderItem(item) {
      return (
          <List.Item 
              style={styles.item}
              actions={[
                  <div key="mark-as-completed">
                      <p style={styles.p}>
                          {item.completed ? 'Complete' : 'Check when completed'}
                      </p>
                      <div>
                          <input
                              type="checkbox"
                              checked={item.completed}
                              onChange={() => updateNote(item)}
                          />
                      </div>
                  </div>,
                  item.completed && (
                      <button key="delete" class="green-button" style={styles.deleteButton} onClick={() => deleteNote(item)}>Delete?</button>
                  )
              ]}
          >
              <List.Item.Meta
                  title={item.name}
                  description={item.description}
              />
              </List.Item>
      );
      
  };  

  
  return (
    <div style={styles.container}>
        <h1>Today's to-do List</h1>
        <Input
            onChange={onChange}
            value={state.form.name}
            placeholder="To-do Item"
            name='name'
            style={styles.input}
        />
        <Input
            onChange={onChange}
            value={state.form.description}
            placeholder="Item description"
            name='description'
            style={styles.input}
        />
        <Button
            onClick={createNote}
            type="primary"
        >Add to list</Button>    
        <List
            loading={state.loading}
            dataSource={state.notes}
            renderItem={renderItem}
        />
      <hr /> {/* Horizontal line */}
      <p>Total completed items: {completedCount}</p> {/* Running total */}
    </div>
);
}


export default App;