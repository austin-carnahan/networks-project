import { StatusBar } from 'expo-status-bar';
import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';

export default function App() {

  // Initialize a 4x6 2D array with all values set to false
  const [grid, setGrid] = useState(Array(5).fill().map(() => Array(6).fill(false)));
  const [ws, setWs] = useState(null);
  const [debugMessage, setDebugMessage] = useState('');

  const connect = () => {
    const ws = new WebSocket('ws://10.160.249.1/ws');

    ws.onopen = () => {
      console.log('WebSocket connection opened');
      setDebugMessage('WebSocket connection opened');
    };

    ws.onmessage = (e) => {
      console.log('Received message');
      setDebugMessage('Received message');
     
      let receivedGrid = JSON.parse(e.data);
      setGrid(receivedGrid);
    };

    ws.onerror = (e) => {
      console.error('WebSocket error:', e.message);
      setDebugMessage('WebSocket error:', e.message);
    };

    ws.onclose = (e) => {
      console.log('WebSocket connection closed', e.code, e.reason);
      setDebugMessage('WebSocket connection closed', e.code, e.reason);
      // Try to reconnect after a delay
      setTimeout(connect, 10000);
    };

    setWs(ws);
  };

  useEffect(() => {
    connect();

    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, []);

  const sendMessage = (message) => {
    return fetch('http://10.160.249.1/message', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `message=${encodeURIComponent(message)}`,
    })
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      console.log('Message sent successfully');
      return response;
    })
    .catch(error => {
      console.error('There was a problem sending the message:', error);
      throw error;
    });
  }


  const handlePress = (i, j) => {
    console.log("detected press")
    setDebugMessage("detected press")
    // Copy the current grid state
    let newGrid = [...grid];
    // Toggle the value at index [i][j]
    newGrid[i][j] = !newGrid[i][j];
    // Update the grid state
    setGrid(newGrid);

    console.log("pressed index: ", i, j)
    setDebugMessage("pressed index: ", i, j)

    // Send a message over the WebSocket
    if (ws) {
      ws.send(JSON.stringify(newGrid));
    } else {
      console.log("No Websocket connection available!")
      setDebugMessage("No Websocket connection available!")
    }
  };

  return (
    <View style={styles.container}>
      <Text>{debugMessage}</Text>
      {grid.map((row, i) => (
        <View key={i} style={styles.row}>
          {row.map((value, j) => (
            <TouchableOpacity
              key={j}
              style={[styles.square, { backgroundColor: value ? 'green' : 'white' }]}
              onPress={() => handlePress(i, j)}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
  },
  square: {
    width: 50,
    height: 50,
    borderColor: 'black',
    borderWidth: 1,
    margin: 2,
  },
});
